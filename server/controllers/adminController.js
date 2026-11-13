const mongoose = require("mongoose");
const User = require("../models/User");

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

module.exports = { listUsers, updateUserStatus };
