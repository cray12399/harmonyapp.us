const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !/^Bearer \S+$/i.test(authHeader)) {
    return res.status(401).json({
      error: "Authentication token required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof decoded.userId !== "string") {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    console.error("Authentication middleware error:", error.message);
    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = authMiddleware;
