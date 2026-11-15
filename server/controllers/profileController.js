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
      "_id username nickname email isVerified status avatar statusMessage createdAt"
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
        avatar: user.avatar ?? "",
        statusMessage: user.statusMessage ?? "",
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

// PATCH /api/auth/me
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    const allowedFields = [
      "username",
      "nickname",
      "avatar",
      "statusMessage",
    ];

    const updates = req.body;

    if (
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      return res.status(400).json({
        error: "Invalid request body",
      });
    }

    const fields = Object.keys(updates);

    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        error: "No valid profile updates provided",
      });
    }

    for (const field of fields) {
      if (typeof updates[field] !== "string") {
        return res.status(400).json({
          error: `${field} must be a string`,
        });
      }

      updates[field] = updates[field].trim();
    }

    if (
      updates.username !== undefined &&
      (updates.username.length < 3 ||
        updates.username.length > 32 ||
        !/^[a-zA-Z0-9_]+$/.test(updates.username))
    ) {
      return res.status(400).json({
        error: "Username must be 3-32 characters and contain only letters, numbers, or underscores",
      });
    }

    if (
      updates.nickname !== undefined &&
      (updates.nickname.length < 1 ||
        updates.nickname.length > 32)
    ) {
      return res.status(400).json({
        error: "Nickname must be 1-32 characters",
      });
    }

    if (
      updates.statusMessage !== undefined &&
      updates.statusMessage.length > 200
    ) {
      return res.status(400).json({
        error: "Status message must be 200 characters or fewer",
      });
    }

    if (updates.avatar !== undefined) {
      if (updates.avatar.length > 2048) {
        return res.status(400).json({
          error: "Avatar URL is too long",
        });
      }

      if (updates.avatar) {
        try {
          const url = new URL(updates.avatar);

          if (
            !["http:", "https:"].includes(url.protocol) ||
            !url.hostname
          ) {
            throw new Error("Invalid URL");
          }
        } catch {
          return res.status(400).json({
            error: "Avatar must be a valid HTTP or HTTPS URL",
          });
        }
      }
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (
      updates.username !== undefined &&
      updates.username !== user.username
    ) {
      const existingUser = await User.findOne({
        username: updates.username,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          error: "Username already taken",
        });
      }
    }

    for (const field of fields) {
      user[field] = updates[field];
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        isVerified: user.isVerified,
        status: user.status,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Username already taken",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Invalid profile information",
      });
    }

    console.error("Update profile error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = { getProfile, updateProfile };
