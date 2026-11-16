
const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },

    // Same key regardless of who sends the request.
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "friendships" }
);

friendshipSchema.index({ requester: 1 });
friendshipSchema.index({ recipient: 1 });

module.exports = mongoose.model("Friendship", friendshipSchema);
