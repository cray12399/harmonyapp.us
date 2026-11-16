const mongoose = require("mongoose");

const messageReportSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "kept", "deleted"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "messageReports" }
);

// One user can report a message once. Other members may report it too.
messageReportSchema.index({ message: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model("MessageReport", messageReportSchema);
