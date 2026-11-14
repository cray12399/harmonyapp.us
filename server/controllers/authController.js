const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const User = require("../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

const makeCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

// POST /api/auth/register
const register = async (req, res) => {
  console.log("==================================================");
  console.log("[AUTH CONTROLLER] Register endpoint hit.");
  console.log("[AUTH CONTROLLER] Incoming headers:", req.headers);
  console.log("[AUTH CONTROLLER] Incoming raw body keys:", Object.keys(req.body || {}));
  console.log("[AUTH CONTROLLER] Incoming body values:", {
    username: req.body?.username,
    email: req.body?.email,
    passwordLength: req.body?.password ? req.body.password.length : 0
  });

  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 20 ||
      !email.trim() ||
      password.length < 8
    ) {
      console.warn("[AUTH CONTROLLER] Validation failed on incoming registration fields.");
      return res.status(400).json({
        error: "Provide a username (3-20 characters), email, and password (at least 8 characters)",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    console.log(`[AUTH CONTROLLER] Checking for existing user: username='${normalizedUsername}', email='${normalizedEmail}'`);

    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      console.warn("[AUTH CONTROLLER] Conflict: Username or email already exists in DB.");
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    const code = makeCode();
    const passwordHash = await bcrypt.hash(password, 10);
    console.log("[AUTH CONTROLLER] Password hashed successfully. Creating MongoDB user record...");

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      status: 1,
      authCode: hashCode(code),
      authCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      authCodeLastSentAt: new Date(),
    });

    console.log("[AUTH CONTROLLER] User created successfully in MongoDB with ID:", user._id);
    console.log("[AUTH CONTROLLER] Now attempting to dispatch verification email...");

    try {
      await sendVerificationEmail(normalizedEmail, code);
      console.log("[AUTH CONTROLLER] sendVerificationEmail completed without throwing.");
    } catch (emailError) {
      console.error("==================================================");
      console.error("[AUTH CONTROLLER] CRITICAL CAUGHT EMAIL EXCEPTION:");
      console.error("- Error Name:", emailError.name);
      console.error("- Error Message:", emailError.message);
      console.error("- Full Stack:", emailError.stack);
      console.error("==================================================");
      return res.status(503).json({
        error: `Account created, but verification email failed: ${emailError.message}`,
      });
    }

    console.log("[AUTH CONTROLLER] Registration flow fully successful. Responding with 201.");
    return res.status(201).json({
      message: "Registration successful. Check your email for a verification code.",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("==================================================");
    console.error("[AUTH CONTROLLER] CRITICAL REGISTER CATCH EXCEPTION:");
    console.error("- Message:", error.message);
    console.error("- Stack:", error.stack);
    console.error("==================================================");

    if (error.code === 11000) {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Valid email and 6-digit code are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || user.isVerified || !user.authCode || !user.authCodeExpires || user.authCodeExpires <= new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const suppliedHash = Buffer.from(hashCode(code), "hex");
    const storedHash = Buffer.from(user.authCode, "hex");

    if (suppliedHash.length !== storedHash.length || !crypto.timingSafeEqual(suppliedHash, storedHash)) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.authCode = undefined;
    user.authCodeExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username or email and password are required" });
    }

    const queryIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: queryIdentifier }, { username: identifier.trim() }]
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Please verify your email before logging in" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.isVerified) {
      return res.status(200).json({
        message: "If the account needs verification, a code will be sent.",
      });
    }

    const now = new Date();
    const cooldownMs = 60 * 1000;

    if (
      user.authCodeLastSentAt &&
      now.getTime() - user.authCodeLastSentAt.getTime() < cooldownMs
    ) {
      const retryAfter = Math.ceil(
        (cooldownMs -
          (now.getTime() - user.authCodeLastSentAt.getTime())) / 1000
      );

      res.set("Retry-After", String(retryAfter));

      return res.status(429).json({
        error: "Please wait before requesting another code.",
        retryAfter,
      });
    }

    const code = makeCode();

    // Reserve the cooldown before sending to prevent rapid repeat requests.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isVerified: false,
        $or: [
          { authCodeLastSentAt: null },
          { authCodeLastSentAt: { $lte: new Date(now.getTime() - cooldownMs) } },
        ],
      },
      {
        $set: {
          authCode: hashCode(code),
          authCodeExpires: new Date(now.getTime() + 10 * 60 * 1000),
          authCodeLastSentAt: now,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(429).json({
        error: "Please wait before requesting another code.",
        retryAfter: 60,
      });
    }

    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch (emailError) {
      console.error("Resend verification email failed:", emailError.message);

      return res.status(503).json({
        error: "Unable to send verification email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: "Verification code sent. Please check your email.",
    });
  } catch (error) {
    console.error("Resend verification error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Avoid revealing whether an email address is registered.
    const successMessage = {
      message: "If the account exists, a password reset code will be sent.",
    };

    if (!user) {
      return res.status(200).json(successMessage);
    }

    const now = new Date();
    const cooldownMs = 60 * 1000;

    // Do not issue another code during an active lockout
    if (
      user.resetPasswordLockedUntil &&
      user.resetPasswordLockedUntil > now
    ) {
      return res.status(200).json(successMessage);
    }

    // Allow a new reset request after the lockout expires
    if (
      user.resetPasswordLockedUntil &&
      user.resetPasswordLockedUntil <= now
    ) {
      await User.updateOne(
        {
          _id: user._id,
          resetPasswordLockedUntil: { $lte: now },
        },
        {
          $set: {
            resetPasswordLastSentAt: null,
          },
        }
      );
    }

    if (
      user.resetPasswordLastSentAt &&
      now.getTime() - user.resetPasswordLastSentAt.getTime() < cooldownMs
    ) {
      return res.status(200).json(successMessage);
    }

    const code = makeCode();

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        $and: [
          {
            $or: [
              { resetPasswordLockedUntil: null },
              { resetPasswordLockedUntil: { $lte: now } },
            ],
          },
          {
            $or: [
              { resetPasswordLastSentAt: null },
              {
                resetPasswordLastSentAt: {
                  $lte: new Date(now.getTime() - cooldownMs),
                },
              },
            ],
          },
        ],
      },
      {
        $set: {
          resetPasswordCode: hashCode(code),
          resetPasswordExpires: new Date(now.getTime() + 10 * 60 * 1000),
          resetPasswordLastSentAt: now,
          resetPasswordAttempts: 0,
          resetPasswordLockedUntil: null,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(200).json(successMessage);
    }

    try {
      await sendPasswordResetEmail(normalizedEmail, code);
    } catch (emailError) {
      console.error("Password reset email failed:", emailError.message);

      // Clear the failed reset request only if it is still current.
      await User.updateOne(
        {
          _id: updatedUser._id,
          resetPasswordCode: hashCode(code),
        },
        {
          $unset: {
            resetPasswordCode: "",
            resetPasswordExpires: "",
          },
          $set: {
            resetPasswordLastSentAt: null,
          },
        }
      );

      return res.status(200).json(successMessage);
    }

    return res.status(200).json(successMessage);
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        error: "Valid email, 6-digit code, and new password (at least 8 characters) are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+resetPasswordCode +resetPasswordExpires");

    if (
      !user ||
      !user.resetPasswordCode ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires <= new Date()
    ) {
      return res.status(400).json({
        error: "Invalid or expired reset code",
      });
    }

    // Block attempts while the reset code is locked
    if (
      user.resetPasswordAttempts >= 5 ||
      (user.resetPasswordLockedUntil &&
        user.resetPasswordLockedUntil > new Date())
    ) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Request a new code later.",
      });
    }

    const suppliedHash = Buffer.from(hashCode(code), "hex");
    const storedHash = Buffer.from(user.resetPasswordCode, "hex");

    if (
      suppliedHash.length !== storedHash.length ||
      !crypto.timingSafeEqual(suppliedHash, storedHash)
    ) {
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          resetPasswordCode: user.resetPasswordCode,
          resetPasswordAttempts: { $lt: 5 },
        },
        {
          $inc: { resetPasswordAttempts: 1 },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(429).json({
          error: "Too many incorrect attempts.",
        });
      }

      if (updated.resetPasswordAttempts >= 5) {
        await User.updateOne(
          {
            _id: user._id,
            resetPasswordCode: user.resetPasswordCode,
            resetPasswordAttempts: { $gte: 5 },
          },
          {
            $set: {
              resetPasswordLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              },
            }
        );

        return res.status(429).json({
          error: "Too many incorrect attempts. Try again in 15 minutes.",
        });
      }

      return res.status(400).json({
        error: "Invalid or expired reset code",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetPasswordCode: user.resetPasswordCode,
        resetPasswordExpires: { $gt: new Date() },
        resetPasswordAttempts: { $lt: 5 },
        $or: [
          { resetPasswordLockedUntil: null },
          { resetPasswordLockedUntil: { $lte: new Date() } },
        ],
      },
      {
        $set: {
          passwordHash: newPasswordHash,
          resetPasswordAttempts: 0,
          resetPasswordLockedUntil: null,
        },
        $unset: {
          resetPasswordCode: "",
          resetPasswordExpires: "",
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        error: "Invalid or expired reset code",
      });
    }

    return res.status(200).json({
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
