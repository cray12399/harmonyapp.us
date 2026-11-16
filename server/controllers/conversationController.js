const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const MessageReport = require("../models/MessageReport");
const { REMOVED_MESSAGE_TEXT } = require("../constants/message");

const CONVERSATION_FIELDS =
  "_id type name members createdBy lastMessageAt createdAt";
const MESSAGE_FIELDS =
  "_id conversation sender content isRemoved createdAt";

// Choose response fields explicitly. A removed message never exposes
// its original content through this API.
const messageForClient = (message) => ({
  _id: message._id,
  conversation: message.conversation,
  sender: message.sender?._id ?? message.sender,
  senderUsername: message.sender?.username ?? null,
  senderNickname: message.sender?.nickname ?? null,
  content: message.isRemoved ? REMOVED_MESSAGE_TEXT : message.content,
  isRemoved: message.isRemoved,
  createdAt: message.createdAt,
});

const listEligibleUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      status: { $in: [1, 2] },
      isVerified: true,
    })
      .select("_id username")
      .sort({ username: 1 })
      .lean();

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Could not list eligible users:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

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
      .populate("members", "_id username nickname")
      .lean();

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("Could not list conversations:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const createConversation = async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { type, name, memberIds } = req.body ?? {};

  // This handler creates groups. A DM creation handler can later share
  if (type !== 0 && type !== 1) {
    return res.status(400).json({ error: "Conversation type must be 0 or 1" });
  }

  if (type === 1 && (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 80
  )) {
    return res.status(400).json({
      error: "Group name must be 1–80 characters",
    });
  }

  // A DM has one other member; a group has two to nine other members.
  if (
    !Array.isArray(memberIds) ||
    (type === 0 && memberIds.length !== 1) ||
    (type === 1 && (memberIds.length < 2 || memberIds.length > 9)) ||
    memberIds.some(
      (id) => typeof id !== "string" || !mongoose.isValidObjectId(id)
    )
  ) {
    return res.status(400).json({
      error: type === 0
        ? "Provide one valid other member ID"
        : "Provide 2–9 valid other member IDs",
    });
  }

  const otherIds = memberIds.map((id) => id.toLowerCase());
  const dmKey = type === 0
    ? [String(req.user._id), otherIds[0]].sort().join(":")
    : undefined;

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

    // Reopening a DM returns the existing conversation and its history.
    if (type === 0) {
      const existing = await Conversation.findOne({
        type: 0,
        members: { $all: [req.user._id, otherIds[0]], $size: 2 },
      })
        .select(CONVERSATION_FIELDS)
        .populate("members", "_id username nickname")
        .lean();

      if (existing) {
        return res.status(200).json({ conversation: existing });
      }
    }

    const created = await Conversation.create({
      type,
      name: type === 1 ? name.trim() : null,
      dmKey,
      members: [req.user._id, ...otherIds],
      createdBy: req.user._id,
    });

    // Include member display names so the UI can show the conversation immediately.
    const conversation = await Conversation.findById(created._id)
      .select(CONVERSATION_FIELDS)
      .populate("members", "_id username nickname")
      .lean();

    return res.status(201).json({ conversation });
  } catch (error) {
    if (type === 0 && error.code === 11000) {
      const existing = await Conversation.findOne({ dmKey })
        .select(CONVERSATION_FIELDS)
        .populate("members", "_id username nickname")
        .lean();
      if (existing) return res.status(200).json({ conversation: existing });
    }
    console.error("Could not create conversation:", error);
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
      .populate("sender", "_id username nickname")
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
      message: {
        ...messageForClient(message),
        senderUsername: req.user.username,
        senderNickname: req.user.nickname,
      },
    });
  } catch (error) {
    console.error("Could not send message:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const deleteGroup = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid group ID" });
  }

  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const group = await Conversation.findOne({ _id: id, type: 1 }).session(session);
      if (!group) return { status: 404, error: "Group not found" };
      if (String(group.createdBy) !== String(req.user._id)) {
        return { status: 403, error: "Only the group creator can delete this group" };
      }

      const groupMessages = await Message.find({ conversation: id })
        .select("_id")
        .session(session)
        .lean();
      const groupMessageIds = groupMessages.map((message) => message._id);
      const reportedMessages = groupMessageIds.length
        ? await MessageReport.find({
            message: { $in: groupMessageIds },
          })
            .select("message")
            .session(session)
            .lean()
        : [];
      const retainedMessageIds = reportedMessages.map((report) => report.message);

      await Message.deleteMany(
        {
          conversation: id,
          _id: { $nin: retainedMessageIds },
        },
        { session }
      );
      await Conversation.deleteOne({ _id: id }, { session });

      return { status: 200 };
    });

    return res.status(result.status).json(
      result.error ? { error: result.error } : { message: "Group deleted" }
    );
  } catch (error) {
    console.error("Could not delete group:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const leaveGroup = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid group ID" });
  }

  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const group = await Conversation.findOne({ _id: id, type: 1 }).session(session);
      if (!group) return { status: 404, error: "Group not found" };
      if (String(group.createdBy) === String(req.user._id)) {
        return { status: 409, error: "The group creator must delete the group instead" };
      }
      if (!group.members.some((memberId) => String(memberId) === String(req.user._id))) {
        return { status: 404, error: "You are not a member of this group" };
      }

      const updatedGroup = await Conversation.findOneAndUpdate(
        {
          _id: id,
          type: 1,
          createdBy: { $ne: req.user._id },
          members: req.user._id,
        },
        { $pull: { members: req.user._id } },
        { new: true, session }
      );
      if (!updatedGroup) {
        return { status: 404, error: "You are not a member of this group" };
      }

      const [leaveMessage] = await Message.create(
        [{
          conversation: id,
          sender: req.user._id,
          content: "left the group.",
        }],
        { session }
      );
      updatedGroup.lastMessageAt = leaveMessage.createdAt;
      await updatedGroup.save({ session });

      return { status: 200 };
    });

    return res.status(result.status).json(
      result.error ? { error: result.error } : { message: "You left the group" }
    );
  } catch (error) {
    console.error("Could not leave group:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const reportMessage = async (req, res) => {
  const { id, messageId } = req.params;
  const reason = req.body?.reason;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(messageId)) {
    return res.status(400).json({ error: "Invalid conversation or message ID" });
  }

  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    return res.status(400).json({ error: "Reason must be 1–500 characters" });
  }

  try {
    const membership = await Conversation.exists({
      _id: id,
      members: req.user._id,
    });
    if (!membership) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversation: id,
      isRemoved: { $ne: true },
    }).select("_id").lean();
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const report = await MessageReport.create({
      message: messageId,
      reportedBy: req.user._id,
      reason: reason.trim(),
    });
    return res.status(201).json({ reportId: report._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "You already reported this message" });
    }
    console.error("Could not report message:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  listEligibleUsers,
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  deleteGroup,
  leaveGroup,
  reportMessage,
};
