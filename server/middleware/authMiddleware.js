const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !/^Bearer \S+$/i.test(authorization)
  ) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  // A missing signing secret is a server configuration error, not a bad token.
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({ error: "Server error" });
  }

  let decoded;
  try {
    decoded = jwt.verify(
      authorization.split(" ")[1],
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    console.error("Token verification error:", error);
    return res.status(500).json({ error: "Server error" });
  }

  if (
    typeof decoded.userId !== "string" ||
    !mongoose.isValidObjectId(decoded.userId)
  ) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    // Fetch the current account so a role change or disable takes effect
    // immediately, even when the caller still has an unexpired token.
    const user = await User.findById(decoded.userId)
      .select("_id status isVerified")
      .lean();

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (user.status !== 1 && user.status !== 2) {
      return res.status(403).json({ error: "Account disabled" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Email verification required" });
    }

    // Controllers use _id and status; /api/auth/me uses userId.
    req.user = {
      _id: user._id,
      userId: String(user._id),
      status: user.status,
    };

    return next();
  } catch (error) {
    console.error("Authentication lookup error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.status !== 2) {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
};

// Preserve the existing default export used by /api/auth/me.
module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
