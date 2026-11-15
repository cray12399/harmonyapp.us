const mongoose = require("mongoose");
const User = require("../models/User");

// GET /api/auth/me
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    const user = await User.findById(userId).select(
      "_id username nickname email isVerified status createdAt"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        nickname: user.nickname ?? user.username,
        email: user.email,
        isVerified: user.isVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = { getProfile };
