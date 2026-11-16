const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const User = require("../models/User");
const Message = require("../models/Message");
const MessageReport = require("../models/MessageReport");
const { REMOVED_MESSAGE_TEXT } = require("../constants/message");
const { sendVerificationEmail } = require("../services/emailService");

const ADMIN_STATUS = 2;
const ALLOWED_STATUSES = new Set([0, 1, 2]);
const PUBLIC_USER_FIELDS = "_id username nickname email status isVerified createdAt";

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  nickname: user.nickname,
  email: user.email,
  status: user.status,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const listUsers = async (req, res) => {
  // req.user must come from trusted authentication middleware, not the request body.
  // This also denies access while that middleware has not been connected.
  if (req.user?.status !== ADMIN_STATUS) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const users = await User.find({})
      .select(PUBLIC_USER_FIELDS)
      .sort({ username: 1 })
      .lean();

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Could not list users:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const updateUserStatus = async (req, res) => {
  if (req.user?.status !== ADMIN_STATUS) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const updates = req.body;
  const allowedFields = new Set(["username", "nickname", "email", "status"]);
  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0 ||
    Object.keys(updates).some((field) => !allowedFields.has(field))
  ) {
    return res.status(400).json({ error: "Provide valid user fields to update" });
  }

  const normalized = {};
  if (updates.username !== undefined) {
    if (typeof updates.username !== "string") {
      return res.status(400).json({ error: "Username must be a string" });
    }
    normalized.username = updates.username.trim();
    if (
      normalized.username.length < 3 ||
      normalized.username.length > 32 ||
      !/^[a-zA-Z0-9_]+$/.test(normalized.username)
    ) {
      return res.status(400).json({
        error: "Username must be 3-32 characters and contain only letters, numbers, or underscores",
      });
    }
  }
  if (updates.nickname !== undefined) {
    if (typeof updates.nickname !== "string") {
      return res.status(400).json({ error: "Nickname must be a string" });
    }
    normalized.nickname = updates.nickname.trim();
    if (normalized.nickname.length < 1 || normalized.nickname.length > 32) {
      return res.status(400).json({ error: "Nickname must be 1-32 characters" });
    }
  }
  if (updates.email !== undefined) {
    if (typeof updates.email !== "string") {
      return res.status(400).json({ error: "Email must be a string" });
    }
    normalized.email = updates.email.trim().toLowerCase();
    if (!validEmail(normalized.email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
  }
  if (
    updates.status !== undefined &&
    !ALLOWED_STATUSES.has(updates.status)
  ) {
    return res.status(400).json({
      error: "Status must be 0 (disabled), 1 (user), or 2 (admin)",
    });
  }

  let verificationCode;
  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const user = await User.findById(id).session(session);
      if (!user) return { status: 404, error: "User not found" };

      if (
        normalized.username !== undefined &&
        normalized.username !== user.username
      ) {
        const existing = await User.findOne({
          username: normalized.username,
          _id: { $ne: user._id },
        }).session(session);
        if (existing) return { status: 409, error: "Username already in use" };
      }

      const emailChanged =
        normalized.email !== undefined && normalized.email !== user.email;
      if (emailChanged) {
        const existing = await User.findOne({
          email: normalized.email,
          _id: { $ne: user._id },
        }).session(session);
        if (existing) return { status: 409, error: "Email already in use" };
        verificationCode = String(crypto.randomInt(100000, 1000000));
        user.isVerified = false;
        user.authCode = hashCode(verificationCode);
        user.authCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.authCodeLastSentAt = new Date();
      }

      const nextStatus = updates.status;
      if (
        user.status === ADMIN_STATUS &&
        nextStatus !== undefined &&
        nextStatus !== ADMIN_STATUS
      ) {
        if (String(user._id) === String(req.user.userId)) {
          return { status: 409, error: "You cannot demote your own admin account" };
        }
        const adminCount = await User.countDocuments({
          status: ADMIN_STATUS,
          isVerified: true,
        })
          .session(session);
        if (adminCount <= 1) {
          return { status: 409, error: "The last admin account cannot be demoted" };
        }
      }

      Object.assign(user, normalized);
      if (nextStatus !== undefined) user.status = nextStatus;
      await user.save({ session });
      return { status: 200, user: publicUser(user), emailChanged };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    if (result.emailChanged) {
      try {
        await sendVerificationEmail(result.user.email, verificationCode);
      } catch (emailError) {
        console.error("User email updated but verification email failed:", emailError);
        return res.status(503).json({
          error: "User email updated, but the verification email could not be sent",
          user: result.user,
        });
      }
    }

    return res.status(200).json({
      user: result.user,
      ...(result.emailChanged
        ? { message: "Email updated. The user must verify the new address." }
        : {}),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username or email already in use" });
    }
    console.error("Could not update user:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const createAdminUser = async (req, res) => {
  if (req.user?.status !== ADMIN_STATUS) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { username, nickname, email, password } = req.body ?? {};
  if (
    typeof username !== "string" ||
    typeof nickname !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      error: "Username, nickname, email, and password are required",
    });
  }

  const normalized = {
    username: username.trim(),
    nickname: nickname.trim(),
    email: email.trim().toLowerCase(),
  };
  if (
    normalized.username.length < 3 ||
    normalized.username.length > 32 ||
    !/^[a-zA-Z0-9_]+$/.test(normalized.username)
  ) {
    return res.status(400).json({
      error: "Username must be 3-32 characters and contain only letters, numbers, or underscores",
    });
  }
  if (normalized.nickname.length < 1 || normalized.nickname.length > 32) {
    return res.status(400).json({ error: "Nickname must be 1-32 characters" });
  }
  if (!validEmail(normalized.email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  try {
    const user = await User.create({
      ...normalized,
      passwordHash: await bcrypt.hash(password, 10),
      status: ADMIN_STATUS,
      isVerified: false,
      authCode: hashCode(code),
      authCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      authCodeLastSentAt: new Date(),
    });

    try {
      await sendVerificationEmail(user.email, code);
    } catch (emailError) {
      console.error("Admin account created but verification email failed:", emailError);
      return res.status(503).json({
        error: "Admin account created, but the verification email could not be sent",
        user: publicUser(user),
      });
    }

    return res.status(201).json({
      user: publicUser(user),
      message: "Admin account created. The user must verify their email before signing in.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username or email already in use" });
    }
    console.error("Could not create admin account:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const setUserPassword = async (req, res) => {
  if (req.user?.status !== ADMIN_STATUS) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.params;
  const password = req.body?.password;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordHash: await bcrypt.hash(password, 10),
          resetPasswordAttempts: 0,
          resetPasswordLockedUntil: null,
        },
        $unset: {
          resetPasswordCode: "",
          resetPasswordExpires: "",
        },
      },
      { new: true }
    ).select(PUBLIC_USER_FIELDS).lean();

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user, message: "Password updated successfully" });
  } catch (error) {
    console.error("Could not update user password:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const updateAllUserStatuses = async (req, res) => {
  if (req.user?.status !== ADMIN_STATUS) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const status = req.body?.status;
  if (status !== 0 && status !== 1) {
    return res.status(400).json({ error: "Bulk status must be 0 (disabled) or 1 (enabled)" });
  }

  try {
    const result = await User.updateMany(
      { status: { $ne: ADMIN_STATUS } },
      { $set: { status } }
    );
    return res.status(200).json({
      status,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Could not update all user statuses:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const listReports = async (_req, res) => {
  try {
    const reports = await MessageReport.find({})
      .sort({ createdAt: -1 })
      .populate("reportedBy", "_id username")
      .populate({
        path: "message",
        select: "_id content isRemoved createdAt sender conversation",
        populate: [
          { path: "sender", select: "_id username" },
          { path: "conversation", select: "_id name type" },
        ],
      })
      .lean();

    return res.status(200).json({ reports });
  } catch (error) {
    console.error("Could not list message reports:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const resolveReport = async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body ?? {};
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid report ID" });
  }
  if (decision !== "kept" && decision !== "deleted") {
    return res.status(400).json({ error: "Decision must be kept or deleted" });
  }

  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const report = await MessageReport.findById(id).session(session);
      if (!report) return { status: 404, error: "Report not found" };
      if (report.status !== "pending") {
        return { status: 409, error: "Report was already reviewed" };
      }

      if (decision === "deleted") {
        // Clear the original text as well as marking the message removed.
        const update = await Message.updateOne(
          { _id: report.message },
          { $set: { isRemoved: true, content: REMOVED_MESSAGE_TEXT } },
          { session }
        );
        if (!update.matchedCount) {
          return { status: 404, error: "Reported message not found" };
        }
      }

      report.status = decision;
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
      await report.save({ session });
      return { status: 200, reportId: report._id, decision };
    });

    return res.status(result.status).json(
      result.error ? { error: result.error } : {
        reportId: result.reportId,
        status: result.decision,
      }
    );
  } catch (error) {
    console.error("Could not resolve report:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const removeMessage = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid message ID" });
  }

  try {
    const result = await mongoose.connection.transaction(async (session) => {
      const message = await Message.findOneAndUpdate(
        { _id: id, isRemoved: { $ne: true } },
        { $set: { isRemoved: true, content: REMOVED_MESSAGE_TEXT } },
        { new: true, session }
      );
      if (!message) return false;

      // Reports of a directly removed message should leave the pending queue.
      await MessageReport.updateMany(
        { message: id, status: "pending" },
        {
          $set: {
            status: "deleted",
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
        { session }
      );
      return true;
    });

    if (!result) return res.status(404).json({ error: "Message not found" });
    return res.status(200).json({ messageId: id, isRemoved: true });
  } catch (error) {
    console.error("Could not remove message:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  listUsers,
  updateUserStatus,
  createAdminUser,
  setUserPassword,
  updateAllUserStatuses,
  listReports,
  resolveReport,
  removeMessage,
};
