const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const RevokedToken = require("../models/RevokedToken");
const app = require("../server");

const adminId = new mongoose.Types.ObjectId();
const memberId = new mongoose.Types.ObjectId();
const otherId1 = new mongoose.Types.ObjectId();
const otherId2 = new mongoose.Types.ObjectId();
const conversationId = new mongoose.Types.ObjectId();
const testPasswordHash = bcrypt.hashSync("password123", 4);
const resendApiKeyBeforeTests = process.env.RESEND_API_KEY;
delete process.env.RESEND_API_KEY;
const users = new Map();
const makeUser = (_id, username, nickname, email, status = 1) => ({
  _id,
  username,
  nickname,
  email,
  passwordHash: testPasswordHash,
  status,
  isVerified: true,
  createdAt: new Date(),
  save: async function () { users.set(String(this._id), this); },
});

// Each test starts with independent accounts. Earlier tests promote and edit users.
const resetUsers = () => {
  users.clear();
  for (const user of [
    makeUser(adminId, "admin", "Admin", "admin@example.com", 2),
    makeUser(memberId, "member", "Member", "member@example.com"),
    makeUser(otherId1, "other1", "Other One", "other1@example.com"),
    makeUser(otherId2, "other2", "Other Two", "other2@example.com"),
  ]) {
    users.set(String(user._id), user);
  }
};
const secretBeforeTests = process.env.JWT_SECRET;
process.env.JWT_SECRET = "local-test-secret-that-is-not-used-for-deployment";

const tokenFor = (id, options = {}) =>
  jwt.sign({ userId: String(id) }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    ...options,
  });

const adminToken = tokenFor(adminId);
const memberToken = tokenFor(memberId);
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
  result.session = () => result;
  result.lean = async () => value;
  result.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
  return result;
};

let server;
let canAccessConversation = true;
let lastMessage;

before(async () => {
  replace(RevokedToken, "findOne", async () => null);
  replace(User, "findById", (id) =>
    query(users.get(String(id)) ?? null, ["select"])
  );
  replace(User, "find", () =>
    query([...users.values()], ["select", "sort"])
  );
  replace(User, "create", async (data) => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      ...data,
      save: async function () { users.set(String(this._id), this); },
    };
    users.set(String(user._id), user);
    return user;
  });
  replace(User, "findByIdAndUpdate", (id, update) => {
    const user = users.get(String(id));
    if (user) {
      Object.assign(user, update.$set || {});
      for (const field of Object.keys(update.$unset || {})) delete user[field];
    }
    return query(user ? { ...user, passwordHash: undefined } : null, ["select"]);
  });
  replace(User, "updateMany", async (filter, update) => {
    const matched = [...users.values()].filter((user) => user.status !== 2);
    matched.forEach((user) => { user.status = update.$set.status; });
    return { matchedCount: matched.length, modifiedCount: matched.length };
  });
  replace(User, "findOneAndUpdate", (filter, update) => {
    const user = users.get(String(filter._id));
    if (user && user.status !== 2) {
      user.status = update.$set.status;
      return query(user, ["select"]);
    }
    return query(null, ["select"]);
  });
  replace(User, "countDocuments", (filter) => {
    const matches = (value, condition) => {
      if (condition === undefined) return true;
      if (Array.isArray(condition?.$in)) {
        return condition.$in.some((item) => String(item) === String(value));
      }
      return String(value) === String(condition);
    };

    return query([...users.values()].filter((user) =>
      matches(user._id, filter._id) &&
      matches(user.status, filter.status) &&
      matches(user.isVerified, filter.isVerified)
    ).length, []);
  });
  replace(User, "findOne", (filter) => {
    if (filter.username !== undefined || filter.email !== undefined) {
      return query(null, []);
    }
    const member = users.get(String(memberId));
    return query({
      ...member,
      status: filter.$or?.some((condition) => condition.username === "disabled")
        ? 0
        : member.status,
    }, ["select"]);
  });
  replace(mongoose.connection, "transaction", async (callback) => callback({}));

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
  replace(Message, "find", () => query([], ["select", "sort", "populate"]));
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
  if (resendApiKeyBeforeTests === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = resendApiKeyBeforeTests;
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

beforeEach(() => {
  resetUsers();
  canAccessConversation = true;
  lastMessage = undefined;
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
  assert.equal(me.body.user.username, "member");
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

test("admins can edit another account and email changes require verification", async () => {
  const updated = await request(`/api/admin/users/${memberId}`, {
    token: adminToken,
    method: "PATCH",
    body: {
      username: "updated_member",
      nickname: "Updated Member",
      email: "updated@example.com",
      status: 1,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.username, "updated_member");
  assert.equal(updated.body.user.nickname, "Updated Member");
  assert.equal(updated.body.user.email, "updated@example.com");
  assert.equal(updated.body.user.isVerified, false);
  assert.equal(updated.body.user.passwordHash, undefined);
});

test("admins can set another user's password without returning the hash", async () => {
  const updated = await request(`/api/admin/users/${memberId}/password`, {
    token: adminToken,
    method: "PATCH",
    body: { password: "new-password-123" },
  });
  assert.equal(updated.status, 200);
  assert.equal(await bcrypt.compare("new-password-123", users.get(String(memberId)).passwordHash), true);
  assert.equal(updated.body.user.passwordHash, undefined);
  users.get(String(memberId)).passwordHash = testPasswordHash;
});

test("admins can create verified-by-email admin accounts and cannot demote themselves", async () => {
  const created = await request("/api/admin/users", {
    token: adminToken,
    method: "POST",
    body: {
      username: "newadmin",
      nickname: "New Admin",
      email: "newadmin@example.com",
      password: "new-admin-password",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.status, 2);
  assert.equal(created.body.user.isVerified, false);
  assert.equal(created.body.user.passwordHash, undefined);

  const demotedSelf = await request(`/api/admin/users/${adminId}`, {
    token: adminToken,
    method: "PATCH",
    body: { status: 1 },
  });
  assert.equal(demotedSelf.status, 409);
});

test("bulk status changes apply to regular accounts but leave admins unchanged", async () => {
  const result = await request("/api/admin/users/bulk-status", {
    token: adminToken,
    method: "PATCH",
    body: { status: 0 },
  });
  assert.equal(result.status, 200);
  assert.equal(users.get(String(memberId)).status, 0);
  assert.equal(users.get(String(adminId)).status, 2);
  users.get(String(memberId)).status = 1;
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
