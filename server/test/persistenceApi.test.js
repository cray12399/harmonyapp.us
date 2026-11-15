const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const MessageReport = require("../models/MessageReport");
const { REMOVED_MESSAGE_TEXT } = require("../constants/message");
const app = require("../server");

const adminId = new mongoose.Types.ObjectId();
const memberId = new mongoose.Types.ObjectId();
const conversationId = new mongoose.Types.ObjectId();
const messageId = new mongoose.Types.ObjectId();
const reportId = new mongoose.Types.ObjectId();
const oldSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "integration-test-secret";
const adminToken = jwt.sign({ userId: String(adminId) }, process.env.JWT_SECRET);
const memberToken = jwt.sign({ userId: String(memberId) }, process.env.JWT_SECRET);
const originals = [];
const replace = (object, method, value) => {
  originals.push([object, method, object[method]]);
  object[method] = value;
};
const query = (getValue) => ({
  select() { return this; },
  sort() { return this; },
  populate() { return this; },
  lean: async () => getValue(),
  session: async () => getValue(),
});

let server;
let conversation = null;
let message = null;
let report = null;
let membership = true;

before(async () => {
  replace(User, "findById", (id) => query(() =>
    String(id) === String(adminId)
      ? { _id: adminId, username: "admin", status: 2, isVerified: true }
      : { _id: memberId, username: "member", status: 1, isVerified: true }
  ));
  replace(User, "find", () => query(() => [
    { _id: memberId, username: "member" },
  ]));
  replace(User, "countDocuments", async (filter) => filter._id.$in.length);

  replace(Conversation, "find", () => query(() => conversation ? [conversation] : []));
  replace(Conversation, "findOne", () => query(() => conversation));
  replace(Conversation, "create", async (data) => {
    conversation = {
      _id: conversationId,
      ...data,
      members: [
        { _id: adminId, username: "admin" },
        { _id: memberId, username: "member" },
      ],
    };
    return { _id: conversationId };
  });
  replace(Conversation, "findById", () => query(() => conversation));
  replace(Conversation, "exists", async () => membership);
  replace(Conversation, "updateOne", async () => ({ modifiedCount: 1 }));

  replace(Message, "find", () => query(() => message ? [{
    ...message,
    sender: { _id: adminId, username: "admin" },
  }] : []));
  replace(Message, "create", async (data) => {
    message = {
      _id: messageId,
      ...data,
      isRemoved: false,
      createdAt: new Date(),
    };
    return message;
  });
  replace(Message, "findOne", () => query(() =>
    membership && message && !message.isRemoved ? message : null
  ));
  replace(Message, "updateOne", async () => {
    if (!message) return { matchedCount: 0 };
    message.isRemoved = true;
    message.content = REMOVED_MESSAGE_TEXT;
    return { matchedCount: 1 };
  });
  replace(Message, "findOneAndUpdate", async () => {
    if (!message || message.isRemoved) return null;
    message.isRemoved = true;
    message.content = REMOVED_MESSAGE_TEXT;
    return message;
  });

  replace(MessageReport, "create", async (data) => {
    if (report) {
      const error = new Error("duplicate");
      error.code = 11000;
      throw error;
    }
    report = {
      _id: reportId,
      ...data,
      status: "pending",
      createdAt: new Date(),
      save: async () => {},
    };
    return report;
  });
  replace(MessageReport, "find", () => query(() => report ? [{
    ...report,
    reportedBy: { _id: adminId, username: "admin" },
    message: message ? {
      ...message,
      sender: { _id: adminId, username: "admin" },
      conversation,
    } : null,
  }] : []));
  replace(MessageReport, "findById", () => query(() => report));
  replace(MessageReport, "updateMany", async () => {
    if (report?.status === "pending") report.status = "deleted";
    return { modifiedCount: report ? 1 : 0 };
  });
  replace(mongoose.connection, "transaction", async (callback) => callback({}));

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
});

after(async () => {
  for (const [object, method, value] of originals.reverse()) {
    object[method] = value;
  }
  if (oldSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = oldSecret;
  if (server) await new Promise((resolve) => server.close(resolve));
});

const request = async (path, { token = adminToken, method = "GET", body } = {}) => {
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  return { status: response.status, body: await response.json() };
};

test("eligible users can be listed and DMs reopen without duplicates", async () => {
  const eligible = await request("/api/conversations/eligible-users");
  assert.equal(eligible.status, 200);
  assert.equal(eligible.body.users[0].username, "member");

  const body = { type: 0, memberIds: [String(memberId)] };
  const first = await request("/api/conversations", { method: "POST", body });
  assert.equal(first.status, 201);
  assert.equal(first.body.conversation.type, 0);
  const second = await request("/api/conversations", { method: "POST", body });
  assert.equal(second.status, 200);
  assert.equal(second.body.conversation._id, String(conversationId));
});

test("saved messages are returned by the list endpoint", async () => {
  const path = `/api/conversations/${conversationId}/messages`;
  const sent = await request(path, {
    method: "POST",
    body: { content: "Saved message" },
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.message.senderUsername, "admin");
  const listed = await request(path);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.messages[0].content, "Saved message");
  assert.equal(listed.body.messages[0].senderUsername, "admin");
});

test("members can report messages once; nonmembers cannot", async () => {
  const path = `/api/conversations/${conversationId}/messages/${messageId}/reports`;
  const first = await request(path, {
    token: memberToken,
    method: "POST",
    body: { reason: "Please review this" },
  });
  assert.equal(first.status, 201);
  assert.equal((await request(path, {
    token: memberToken,
    method: "POST",
    body: { reason: "Again" },
  })).status, 409);
  membership = false;
  assert.equal((await request(path, {
    token: memberToken,
    method: "POST",
    body: { reason: "Outsider" },
  })).status, 404);
  membership = true;
});

test("admin report removal clears saved message content", async () => {
  const pending = await request("/api/admin/reports");
  assert.equal(pending.status, 200);
  assert.equal(pending.body.reports[0].status, "pending");

  const result = await request(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    body: { decision: "deleted" },
  });
  assert.equal(result.status, 200);
  assert.equal(report.status, "deleted");
  assert.equal(message.content, REMOVED_MESSAGE_TEXT);
  const listed = await request(`/api/conversations/${conversationId}/messages`);
  assert.equal(listed.body.messages[0].isRemoved, true);
  assert.equal(listed.body.messages[0].content, "Message removed by an admin");
});

test("direct message removal is admin-only", async () => {
  message.isRemoved = false;
  message.content = "Another message";
  const path = `/api/admin/messages/${messageId}`;
  assert.equal((await request(path, {
    token: memberToken,
    method: "DELETE",
  })).status, 403);
  assert.equal((await request(path, { method: "DELETE" })).status, 200);
  assert.equal(message.content, REMOVED_MESSAGE_TEXT);
  assert.equal(message.isRemoved, true);
});
