const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // 0 = DM; 1 = group chat.
    type: { type: Number, enum: [0, 1], required: true },
    dmKey: { type: String, default: undefined },
    name: { type: String, trim: true, maxlength: 80, default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessageAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "conversations" }
);

conversationSchema.index({ members: 1 });
conversationSchema.index(
  { dmKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dmKey: { $type: "string" } },
  }
);

module.exports = mongoose.model("Conversation", conversationSchema);
