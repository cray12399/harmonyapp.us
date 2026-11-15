const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const CONVERSATION_FIELDS =
  "_id type name members createdBy lastMessageAt createdAt";
const MESSAGE_FIELDS =
  "_id conversation sender content isRemoved createdAt";
const REMOVED_TEXT = "Message removed by an admin";

// Choose response fields explicitly. A removed message never exposes
// its original content through this API.
const messageForClient = (message) => ({
  _id: message._id,
  conversation: message.conversation,
  sender: message.sender,
  content: message.isRemoved ? REMOVED_TEXT : message.content,
  isRemoved: message.isRemoved,
  createdAt: message.createdAt,
});

const listConversations = async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const conversations = await Conversation.find({
      members: req.user._id,
    })
      .select(CONVERSATION_FIELDS)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate("members", "_id username")
      .lean();

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("Could not list conversations:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const createGroup = async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { type, name, memberIds } = req.body ?? {};

  // This handler creates groups. A DM creation handler can later share
  // POST /api/conversations.
  if (type !== 1) {
    return res.status(400).json({ error: "Group type must be 1" });
  }

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 80
  ) {
    return res.status(400).json({
      error: "Group name must be 1–80 characters",
    });
  }

  // The server adds the caller, so 2–9 other IDs means 3–10 total members.
  if (
    !Array.isArray(memberIds) ||
    memberIds.length < 2 ||
    memberIds.length > 9 ||
    memberIds.some(
      (id) => typeof id !== "string" || !mongoose.isValidObjectId(id)
    )
  ) {
    return res.status(400).json({
      error: "Provide 2–9 valid other member IDs",
    });
  }

  const otherIds = memberIds.map((id) => id.toLowerCase());

  if (
    otherIds.includes(String(req.user._id)) ||
    new Set(otherIds).size !== otherIds.length
  ) {
    return res.status(400).json({
      error: "Members cannot include you or contain duplicates",
    });
  }

  try {
    // Refuse missing, disabled, or unverified invited accounts.
    const eligibleCount = await User.countDocuments({
      _id: { $in: otherIds },
      status: { $in: [1, 2] },
      isVerified: true,
    });

    if (eligibleCount !== otherIds.length) {
      return res.status(400).json({
        error: "Every invited member must be active and verified",
      });
    }

    const created = await Conversation.create({
      type: 1,
      name: name.trim(),
      members: [req.user._id, ...otherIds],
      createdBy: req.user._id,
    });

    // Include member usernames in the response for the group UI.
    const conversation = await Conversation.findById(created._id)
      .select(CONVERSATION_FIELDS)
      .populate("members", "_id username")
      .lean();

    return res.status(201).json({ conversation });
  } catch (error) {
    console.error("Could not create group:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const listMessages = async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { id } = req.params;
  const { after } = req.query;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  if (
    after !== undefined &&
    (typeof after !== "string" || Number.isNaN(Date.parse(after)))
  ) {
    return res.status(400).json({ error: "Invalid after timestamp" });
  }

  try {
    // A caller must belong to this conversation to read its messages.
    const membership = await Conversation.exists({
      _id: id,
      members: req.user._id,
    });

    if (!membership) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const filter = { conversation: id };
    if (after !== undefined) {
      filter.createdAt = { $gt: new Date(after) };
    }

    const messages = await Message.find(filter)
      .select(MESSAGE_FIELDS)
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    return res.status(200).json({
      messages: messages.map(messageForClient),
    });
  } catch (error) {
    console.error("Could not list messages:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const sendMessage = async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { id } = req.params;
  const content = req.body?.content;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  if (
    typeof content !== "string" ||
    content.trim().length === 0 ||
    content.trim().length > 2000
  ) {
    return res.status(400).json({
      error: "Message content must be 1–2000 characters",
    });
  }

  try {
    // Checking the conversation ID alone would let outsiders send messages.
    const membership = await Conversation.exists({
      _id: id,
      members: req.user._id,
    });

    if (!membership) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await Message.create({
      conversation: id,
      sender: req.user._id,
      content: content.trim(),
    });

    // Keep recently active conversations at the top of the list.
    // The message is already saved, so a failure here is logged while the
    // request still succeeds; that avoids prompting a duplicate resend.
    try {
      await Conversation.updateOne(
        { _id: id },
        { $max: { lastMessageAt: message.createdAt } }
      );
    } catch (activityError) {
      console.error("Message saved; activity update failed:", activityError);
    }

    return res.status(201).json({
      message: messageForClient(message),
    });
  } catch (error) {
    console.error("Could not send message:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  listConversations,
  createGroup,
  listMessages,
  sendMessage,
};
