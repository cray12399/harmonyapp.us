const express = require("express");
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const { logout } = require("../controllers/logoutController");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/profileController");

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);

router.get("/me", authMiddleware, getProfile);
router.patch("/me", authMiddleware, updateProfile);
router.post("/logout", authMiddleware, logout);

module.exports = router;
