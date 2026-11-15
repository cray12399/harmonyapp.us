const mongoose = require("mongoose");
const User = require("../models/User");
const Message = require("../models/Message");
const MessageReport = require("../models/MessageReport");

const ADMIN_STATUS = 2;
const ALLOWED_STATUSES = new Set([0, 1, 2]);

// Choose exactly which fields can leave the API. This excludes password hashes
// and email verification codes.
const PUBLIC_USER_FIELDS = "_id username email status isVerified createdAt";

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
  const status = req.body?.status;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  // 0 disables, 1 enables, and 2 promotes a user to admin.
  // Using a Set with numeric values rejects strings such as "2".
  if (!ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({
      error: "Status must be 0 (disabled), 1 (user), or 2 (admin)",
    });
  }

  try {
    // Update only a non-admin account. Putting this condition in the database
    // query prevents changing someone who became an admin moments earlier.
    const user = await User.findOneAndUpdate(
      { _id: id, status: { $ne: ADMIN_STATUS } },
      { $set: { status } },
      { new: true, runValidators: true }
    )
      .select(PUBLIC_USER_FIELDS)
      .lean();

    if (!user) {
      // No update happened. Find out whether the ID is missing or belongs
      // to an existing admin so the client receives a useful error.
      const target = await User.findById(id).select("_id status").lean();

      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      if (target.status === ADMIN_STATUS) {
        return res.status(409).json({
          error: "Existing admin accounts cannot be changed here",
        });
      }

      return res.status(409).json({
        error: "User was not updated; please retry",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Could not update user status:", error);
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
          { $set: { isRemoved: true, content: "" } },
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
        { $set: { isRemoved: true, content: "" } },
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
  listReports,
  resolveReport,
  removeMessage,
};
