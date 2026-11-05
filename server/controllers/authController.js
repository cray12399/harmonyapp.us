const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const User = require("../models/User");
const { sendVerificationEmail } = require("../services/emailService");

const makeCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

// POST /api/auth/register
const register = async (req, res) => {
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
      return res.status(400).json({
        error: "Provide a username (3-20 characters), email, and password (at least 8 characters)",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    const code = makeCode();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      status: 1,
      authCode: hashCode(code),
      authCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch (emailError) {
      console.error("Verification email failed:", emailError.message);
      return res.status(503).json({
        error: "Account created, but verification email could not be sent",
      });
    }

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
    console.error("Register error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (
      typeof email !== "string" ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)
    ) {
      return res.status(400).json({
        error: "Valid email and 6-digit code are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || user.isVerified || !user.authCode ||
        !user.authCodeExpires || user.authCodeExpires <= new Date()) {
      return res.status(400).json({
        error: "Invalid or expired verification code",
      });
    }

    const suppliedHash = Buffer.from(hashCode(code), "hex");
    const storedHash = Buffer.from(user.authCode, "hex");

    if (
      suppliedHash.length !== storedHash.length ||
      !crypto.timingSafeEqual(suppliedHash, storedHash)
    ) {
      return res.status(400).json({
        error: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.authCode = undefined;
    user.authCodeExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // Fixed: Destructure identifier instead of email

    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({
        error: "Username or email and password are required",
      });
    }

    const queryIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: queryIdentifier },
        { username: identifier.trim() }
      ]
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: "Invalid username/email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
      });
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

module.exports = { register, login, verifyEmail };