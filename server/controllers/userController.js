const User = require("../models/User");

// GET /api/users/search?q=searchterm
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (typeof q !== "string" || !q.trim()) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    const searchTerm = q.trim();

    if (searchTerm.length > 100) {
      return res.status(400).json({
        error: "Search query must be 100 characters or fewer",
      });
    }

    // Escape special regex characters.
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      $or: [
        { username: { $regex: escapedTerm, $options: "i" } },
        { nickname: { $regex: escapedTerm, $options: "i" } },
      ],
    })
      .select("_id username nickname avatar status statusMessage")
      .limit(20)
      .lean();

    return res.status(200).json({
      users: users.map((user) => ({
        _id: user._id,
        username: user.username,
        nickname: user.nickname ?? user.username,
        avatar: user.avatar ?? "",
        status: user.status,
        statusMessage: user.statusMessage ?? "",
      })),
    });
  } catch (error) {
    console.error("Search users error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = { searchUsers };
