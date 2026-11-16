
const mongoose = require("mongoose");
const User = require("../models/User");
const Friendship = require("../models/Friendship");


const FRIENDSHIP_STATUS = {
  PENDING: 0,
  ACCEPTED: 1,
};

const sendFriendRequest = async (req, res) => {
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

  if (members[0] === members[1]) {
    return res.status(400).json({
      error: "You cannot send a friend request to yourself",
    });
  }

  const pairKey = members.join(":");

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

    const existing = await Friendship.findOne({ pairKey });

    if (existing) {
      return res.status(409).json({
        error:
          existing.status === FRIENDSHIP_STATUS.ACCEPTED
            ? "You are already friends"
            : "A friend request already exists between these users",
      });
    }

    const friendship = await Friendship.create({
      requester: userId,
      recipient: recipientId,
      pairKey,
      status: FRIENDSHIP_STATUS.PENDING,
    });

    return res.status(201).json({
      message: "Friend request sent",
      friendship,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "A friend request already exists between these users",
      });
    }

    console.error("Send friend request error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};


const acceptFriendRequest = async (req, res) => {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      error: "Valid friend request ID required",
    });
  }

  try {
    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: requestId,
        recipient: userId,
        status: FRIENDSHIP_STATUS.PENDING,
      },
      {
        $set: {
          status: FRIENDSHIP_STATUS.ACCEPTED,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!friendship) {
      return res.status(404).json({
        error: "Pending friend request not found",
      });
    }

    return res.status(200).json({
      message: "Friend request accepted",
      friendship,
    });
  } catch (error) {
    console.error("Accept friend request error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};


const listFriends = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: userId },
        { recipient: userId },
      ],
    })
      .populate("requester", "username nickname avatar status statusMessage")
      .populate("recipient", "username nickname avatar status statusMessage")
      .sort({ updatedAt: -1 });

    const friends = [];
    const incoming = [];
    const outgoing = [];

    for (const friendship of friendships) {
      const isRequester =
        friendship.requester?._id.toString() === userId;

      const otherUser = isRequester
        ? friendship.recipient
        : friendship.requester;

      if (!otherUser) continue;

      const entry = {
        friendshipId: friendship._id,
        user: otherUser,
        createdAt: friendship.createdAt,
      };

      if (friendship.status === FRIENDSHIP_STATUS.ACCEPTED) {
        friends.push(entry);
      } else if (friendship.status === FRIENDSHIP_STATUS.PENDING) {
        if (isRequester) {
          outgoing.push(entry);
        } else {
          incoming.push(entry);
        }
      }
    }

    return res.status(200).json({
      friends,
      pending: {
        incoming,
        outgoing,
      },
    });
  } catch (error) {
    console.error("List friends error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};


const removeFriend = async (req, res) => {
  const userId = req.user?.userId;
  const { friendshipId } = req.params;

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  if (!mongoose.isValidObjectId(friendshipId)) {
    return res.status(400).json({
      error: "Valid friendship ID required",
    });
  }

  try {
    const friendship = await Friendship.findOneAndDelete({
      _id: friendshipId,
      $or: [
        { requester: userId },
        { recipient: userId },
      ],
    });

    if (!friendship) {
      return res.status(404).json({
        error: "Friendship or friend request not found",
      });
    }

    let message = "Friend removed";

    if (friendship.status === FRIENDSHIP_STATUS.PENDING) {
      message =
        friendship.requester.toString() === userId
          ? "Friend request canceled"
          : "Friend request declined";
    }

    return res.status(200).json({
      message,
    });
  } catch (error) {
    console.error("Remove friend error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  listFriends,
  removeFriend,
};
