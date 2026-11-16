const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const MessageReport = require("../models/MessageReport");
const Friendship = require("../models/Friendship");
const RevokedToken = require("../models/RevokedToken");
const app = require("../server");


const callerId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const conversationId = new mongoose.Types.ObjectId();
const groupId = new mongoose.Types.ObjectId();
const friendshipId = new mongoose.Types.ObjectId();
const previousSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "merged-api-test-secret";
const token = jwt.sign(
  { userId: String(callerId) },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);
const otherToken = jwt.sign(
  { userId: String(otherId) },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);
const originals = [];
const replace = (object, name, value) => {
  originals.push([object, name, object[name]]);
  object[name] = value;
};
const query = (value) => ({
  select() { return this; },
  limit() { return this; },
  populate() { return this; },
  sort() { return this; },
  session() { return this; },
  lean: async () => value,
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const caller = {
  _id: callerId,
  username: "caller",
  nickname: "Caller",
  email: "caller@example.com",
  status: 1,
  isVerified: true,
  save: async () => {},
};
const other = {
  _id: otherId,
  username: "other",
  nickname: "Other",
  status: 1,
  isVerified: true,
};

let server;
let dm;
let group;
let groupMessages = [];
let groupReports = [];
let friendship;
const revoked = new Set();

before(async () => {
  replace(User, "findById", (id) =>
    query(String(id) === String(callerId) ? caller : other)
  );
  replace(User, "findOne", async (filter) =>
    filter.username ? null : other
  );
  replace(User, "find", () => query([other]));

  replace(Conversation, "findOne", (filter) =>
    query(filter.type === 1 ? group : dm)
  );
  replace(Conversation, "findOneAndUpdate", async (filter) => {
    if (!group || !group.members.some((id) => String(id) === String(filter.members))) {
      return null;
    }
    group.members = group.members.filter((id) => String(id) !== String(filter.members));
    return group;
  });
  replace(Conversation, "exists", async () => true);
  replace(Conversation, "updateOne", async () => ({ acknowledged: true }));
  replace(Conversation, "deleteOne", async () => {
    group = null;
    return { deletedCount: 1 };
  });
  replace(Conversation, "create", async (data) => {
    dm = { _id: conversationId, ...data, save: async () => {} };
    return dm;
  });
  replace(mongoose.connection, "transaction", async (callback) => callback({}));
  replace(Message, "find", (filter) => query(
    groupMessages.filter((message) => String(message.conversation) === String(filter.conversation))
  ));
  replace(MessageReport, "find", (filter = {}) => query(
    filter.message?.$in
      ? groupReports.filter((report) =>
          filter.message.$in.some((messageId) => String(messageId) === String(report.message))
        )
      : groupReports
  ));
  replace(Message, "create", async (data) => {
    const records = (Array.isArray(data) ? data : [data]).map((message) => ({
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      ...message,
    }));
    groupMessages.push(...records);
    return Array.isArray(data) ? records : records[0];
  });
  replace(Message, "deleteMany", async (filter) => {
    const previousLength = groupMessages.length;
    const retainedIds = new Set((filter._id?.$nin || []).map(String));
    groupMessages = groupMessages.filter(
      (message) =>
        String(message.conversation) !== String(filter.conversation) ||
        retainedIds.has(String(message._id))
    );
    return { deletedCount: previousLength - groupMessages.length };
  });
  replace(MessageReport, "deleteMany", async (filter) => {
    const messageIds = new Set(filter.message.$in.map(String));
    const previousLength = groupReports.length;
    groupReports = groupReports.filter((report) => !messageIds.has(String(report.message)));
    return { deletedCount: previousLength - groupReports.length };
  });

  replace(Friendship, "findOne", async () => friendship);
  replace(Friendship, "create", async (data) => {
    friendship = {
      _id: friendshipId,
      ...data,
      requester: callerId,
      recipient: otherId,
      createdAt: new Date(),
    };
    return friendship;
  });
  replace(Friendship, "findOneAndUpdate", async () => {
    friendship.status = 1;
    return friendship;
  });
  replace(Friendship, "find", () => query(friendship ? [{
    ...friendship,
    requester: { _id: callerId, username: caller.username },
    recipient: { _id: otherId, username: other.username },
  }] : []));
  replace(Friendship, "findOneAndDelete", async () => {
    const removed = friendship;
    friendship = null;
    return removed;
  });

  replace(RevokedToken, "findOne", async ({ tokenHash }) =>
    revoked.has(tokenHash) ? { tokenHash } : null
  );
  replace(RevokedToken, "updateOne", async ({ tokenHash }) => {
    revoked.add(tokenHash);
    return { acknowledged: true };
  });

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
});

after(async () => {
  for (const [object, name, value] of originals.reverse()) object[name] = value;
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
  if (server) await new Promise((resolve) => server.close(resolve));
});

const request = async (path, { auth = token, method = "GET", body } = {}) => {
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${auth}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  return { status: response.status, body: await response.json() };
};

test("profile read and update keep the existing /me response fields", async () => {
  const me = await request("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.userId, String(callerId));
  assert.equal(me.body.user.username, "caller");
  assert.equal(me.body.user.status, 1);

  const updated = await request("/api/auth/me", {
    method: "PATCH",
    body: { nickname: "New name" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.nickname, "New name");
});

test("authenticated user search and DM creation work", async () => {
  const search = await request("/api/users/search?q=oth");
  assert.equal(search.status, 200);
  assert.equal(search.body.users[0].username, "other");

  const first = await request("/api/conversations/dm", {
    method: "POST",
    body: { recipientId: String(otherId) },
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.conversation.type, 0);
  const second = await request("/api/conversations/dm", {
    method: "POST",
    body: { recipientId: String(otherId) },
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.conversation._id, String(conversationId));
});

test("sent messages include the sender nickname", async () => {
  const sent = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content: "Hello" },
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.message.senderNickname, caller.nickname);
});

test("friend requests can be sent, accepted, listed, and removed", async () => {
  const sent = await request("/api/friends/requests", {
    method: "POST",
    body: { recipientId: String(otherId) },
  });
  assert.equal(sent.status, 201);
  const accepted = await request(
    `/api/friends/requests/${friendshipId}/accept`,
    { auth: otherToken, method: "PATCH" }
  );
  assert.equal(accepted.status, 200);
  const listed = await request("/api/friends");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.friends.length, 1);
  const removed = await request(`/api/friends/${friendshipId}`, {
    method: "DELETE",
  });
  assert.equal(removed.status, 200);
});

test("non-creators can leave groups without deleting messages or reports", async () => {
  const existingMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: groupId,
    sender: callerId,
    content: "Keep this message",
  };
  group = {
    _id: groupId,
    type: 1,
    createdBy: callerId,
    members: [callerId, otherId],
    lastMessageAt: new Date(),
    save: async () => {},
  };
  groupMessages = [existingMessage];
  groupReports = [{ message: existingMessage._id, reason: "Keep this report" }];

  const creatorLeave = await request(`/api/conversations/${groupId}/leave`, {
    method: "POST",
  });
  assert.equal(creatorLeave.status, 409);

  const left = await request(`/api/conversations/${groupId}/leave`, {
    auth: otherToken,
    method: "POST",
  });
  assert.equal(left.status, 200);
  assert.equal(group.members.some((id) => String(id) === String(otherId)), false);
  assert.equal(groupMessages.length, 2);
  assert.equal(groupMessages[1].content, "left the group.");
  assert.equal(groupReports.length, 1);
});

test("only group creators can delete groups while reported messages and reports remain", async () => {
  const reportedMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: groupId,
    sender: callerId,
    content: "Keep this reported message",
  };
  const unreportedMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: groupId,
    sender: otherId,
    content: "Delete this unreported message",
  };
  group = {
    _id: groupId,
    type: 1,
    createdBy: callerId,
    members: [callerId, otherId],
  };
  groupMessages = [reportedMessage, unreportedMessage];
  groupReports = [{ message: reportedMessage._id, reason: "Keep this report" }];

  const denied = await request(`/api/conversations/${groupId}`, {
    auth: otherToken,
    method: "DELETE",
  });
  assert.equal(denied.status, 403);
  assert.equal(groupMessages.length, 2);
  assert.equal(groupReports.length, 1);

  const deleted = await request(`/api/conversations/${groupId}`, {
    method: "DELETE",
  });
  assert.equal(deleted.status, 200);
  assert.equal(group, null);
  assert.deepEqual(groupMessages.map((message) => message._id), [reportedMessage._id]);
  assert.equal(groupMessages[0].content, "Keep this reported message");
  assert.equal(groupReports.length, 1);
  assert.equal(String(groupReports[0].message), String(reportedMessage._id));
});

test("logout revokes only the supplied JWT", async () => {
  const loggedOut = await request("/api/auth/logout", { method: "POST" });
  assert.equal(loggedOut.status, 200);
  assert.equal(revoked.has(crypto.createHash("sha256").update(token).digest("hex")), true);
  assert.equal((await request("/api/auth/me")).status, 401);
  assert.equal((await request("/api/auth/me", { auth: otherToken })).status, 200);
});
