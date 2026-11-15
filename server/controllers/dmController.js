const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");

const createDM = async (req, res) => {
  const userId = req.user?.userId;
  const { recipientId } = req.body ?? {};

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  if (
    typeof recipientId !== "string" ||
    !mongoose.isValidObjectId(recipientId)
  ) {
    return res.status(400).json({
      error: "Valid recipient ID required",
    });
  }

  const members = [userId.toLowerCase(), recipientId.toLowerCase()].sort();
  const dmKey = members.join(":");

  if (members[0] === members[1]) {
    return res.status(400).json({
      error: "You cannot create a DM with yourself",
    });
  }

  try {
    const recipient = await User.findOne({
      _id: recipientId,
      isVerified: true,
      status: { $in: [1, 2] },
    });

    if (!recipient) {
      return res.status(404).json({
        error: "Recipient not found or unavailable",
      });
    }

    let conversation = await Conversation.findOne({
      type: 0,
      $or: [
        { dmKey },
        { members: { $all: members, $size: 2 } },
      ],
    });

    if (conversation) {
      if (!conversation.dmKey) {
        conversation.dmKey = dmKey;
        await conversation.save();
      }

      return res.status(200).json({ conversation });
    }

    try {
      conversation = await Conversation.create({
        type: 0,
        members,
        dmKey,
        createdBy: userId,
      });

      return res.status(201).json({ conversation });
    } catch (error) {
      if (error.code === 11000) {
        conversation = await Conversation.findOne({
          type: 0,
          dmKey,
        });

        if (conversation) {
          return res.status(200).json({ conversation });
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Create DM error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = { createDM };
