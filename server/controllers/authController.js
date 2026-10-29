const bcrypt = require("bcryptjs");
const User = require("../models/User");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Make sure all required fields were provided
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required",
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email.toLowerCase() },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in MongoDB
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: false,
      status: 1,
    });

    // Successful registration
    return res.status(201).json({
      message: "Registration successful",
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

    return res.status(500).json({
      error: "Server error",
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find the user by email
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    // Same response for unknown email or incorrect password
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Compare entered password against stored password hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Successful login
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

    return res.status(500).json({
      error: "Server error",
    });
  }
};

module.exports = {
  register,
  login,
};
