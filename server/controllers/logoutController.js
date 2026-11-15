const RevokedToken = require("../models/RevokedToken");

const logout = async (req, res) => {
  try {
    await RevokedToken.updateOne(
      { tokenHash: req.tokenHash },
      {
        $setOnInsert: {
          tokenHash: req.tokenHash,
          expiresAt: req.tokenExpiresAt,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = { logout };
