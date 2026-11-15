const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const app = require("../server");

const adminId = new mongoose.Types.ObjectId();
const memberId = new mongoose.Types.ObjectId();
const otherId1 = new mongoose.Types.ObjectId();
const otherId2 = new mongoose.Types.ObjectId();
const conversationId = new mongoose.Types.ObjectId();
const users = new Map([
  [String(adminId), { _id: adminId, status: 2, isVerified: true }],
  [String(memberId), { _id: memberId, status: 1, isVerified: true }],
]);
const secretBeforeTests = process.env.JWT_SECRET;
process.env.JWT_SECRET = "local-test-secret-that-is-not-used-for-deployment";

const tokenFor = (id, options = {}) =>
  jwt.sign({ userId: String(id) }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    ...options,
  });

const adminToken = tokenFor(adminId);
const memberToken = tokenFor(memberId);
const testPasswordHash = bcrypt.hashSync("password123", 4);
const originals = [];
const replace = (object, name, replacement) => {
  originals.push([object, name, object[name]]);
  object[name] = replacement;
};

// Match the chainable Mongoose query methods used by the controllers.
const query = (value, methods) => {
  const result = {};
  for (const method of methods) {
    result[method] = () => result;
  }
  result.lean = async () => value;
  return result;
};

let server;
let canAccessConversation = true;
let lastMessage;

before(async () => {
  replace(User, "findById", (id) =>
    query(users.get(String(id)) ?? null, ["select"])
  );
  replace(User, "find", () =>
    query([...users.values()], ["select", "sort"])
  );
  replace(User, "findOneAndUpdate", (filter, update) => {
    const user = users.get(String(filter._id));
    if (user && user.status !== 2) {
      user.status = update.$set.status;
      return query(user, ["select"]);
    }
    return query(null, ["select"]);
  });
  replace(User, "countDocuments", async () => 2);
  replace(User, "findOne", async (filter) => ({
    _id: memberId,
    username: "member",
    passwordHash: testPasswordHash,
    status: filter.$or?.some((condition) => condition.username === "disabled")
      ? 0
      : 1,
    isVerified: true,
  }));

  replace(Conversation, "find", () =>
    query([{ _id: conversationId, members: [adminId, memberId] }], [
      "select", "sort", "populate"
    ])
  );
  replace(Conversation, "create", async () => ({ _id: conversationId }));
  replace(Conversation, "findById", () =>
    query({ _id: conversationId, type: 1, name: "Test group" }, [
      "select", "populate"
    ])
  );
  replace(Conversation, "exists", async () =>
    canAccessConversation ? { _id: conversationId } : null
  );
  replace(Conversation, "updateOne", async () => ({ modifiedCount: 1 }));
  replace(Message, "find", () => query([], ["select", "sort"]));
  replace(Message, "create", async (data) => {
    lastMessage = data;
    return {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      isRemoved: false,
      createdAt: new Date(),
    };
  });

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
});

after(async () => {
  for (const [object, name, original] of originals.reverse()) {
    object[name] = original;
  }
  if (secretBeforeTests === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = secretBeforeTests;
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const request = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}${path}`,
    {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  return { status: response.status, body: await response.json() };
};

test("protected routes reject requests without a token", async () => {
  for (const path of ["/api/auth/me", "/api/admin/users", "/api/conversations"]) {
    assert.equal((await request(path)).status, 401);
  }
});

test("invalid, expired, and unknown-account tokens are rejected", async () => {
  assert.equal((await request("/api/auth/me", { token: "bad-token" })).status, 401);
  assert.equal(
    (await request("/api/auth/me", {
      token: tokenFor(memberId, { expiresIn: -1 }),
    })).status,
    401
  );
  assert.equal(
    (await request("/api/auth/me", {
      token: tokenFor(new mongoose.Types.ObjectId()),
    })).status,
    401
  );
});

test("a regular user can use /me and conversations but not admin routes", async () => {
  const me = await request("/api/auth/me", { token: memberToken });
  assert.equal(me.status, 200);
  assert.equal(me.body.userId, String(memberId));
  assert.equal(
    (await request("/api/conversations", { token: memberToken })).status,
    200
  );
  assert.equal(
    (await request("/api/admin/users", { token: memberToken })).status,
    403
  );
});

test("an admin can list and promote users; the role changes on the next request", async () => {
  assert.equal(
    (await request("/api/admin/users", { token: adminToken })).status,
    200
  );
  const promoted = await request(`/api/admin/users/${memberId}`, {
    token: adminToken,
    method: "PATCH",
    body: { status: 2 },
  });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.status, 2);
  assert.equal(
    (await request("/api/admin/users", { token: memberToken })).status,
    200
  );
});

test("disabled or unverified accounts lose access immediately", async () => {
  const member = users.get(String(memberId));
  member.status = 0;
  assert.equal(
    (await request("/api/auth/me", { token: memberToken })).status,
    403
  );
  member.status = 1;
  member.isVerified = false;
  assert.equal(
    (await request("/api/auth/me", { token: memberToken })).status,
    403
  );
  member.isVerified = true;
});

test("login does not issue a token to a disabled account", async () => {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: { identifier: "disabled", password: "password123" },
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.token, undefined);
});

test("login issues a token that works with /api/auth/me", async () => {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { identifier: "member", password: "password123" },
  });
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.token, "string");

  const me = await request("/api/auth/me", { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.userId, String(memberId));
});

test("authenticated members can create groups and use message routes", async () => {
  const group = await request("/api/conversations", {
    token: adminToken,
    method: "POST",
    body: {
      type: 1,
      name: "Test group",
      memberIds: [String(otherId1), String(otherId2)],
    },
  });
  assert.equal(group.status, 201);

  const path = `/api/conversations/${conversationId}/messages`;
  assert.equal((await request(path, { token: adminToken })).status, 200);
  const sent = await request(path, {
    token: adminToken,
    method: "POST",
    body: { content: "Hello group" },
  });
  assert.equal(sent.status, 201);
  assert.equal(String(lastMessage.sender), String(adminId));
  assert.equal(sent.body.message.content, "Hello group");

  canAccessConversation = false;
  assert.equal((await request(path, { token: adminToken })).status, 404);
  assert.equal(
    (await request(path, {
      token: adminToken,
      method: "POST",
      body: { content: "Should not send" },
    })).status,
    404
  );
});
