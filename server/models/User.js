const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  passwordHash: {
    type: String,
    required: true,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  status: {
    type: Number,
    default: 1,
  },

  authCode: {
    type: String,
  },

  authCodeExpires: {
    type: Date,
    default: null,
  },

  authCodeLastSentAt: {
    type: Date,
    default: null,
  },

  resetPasswordCode: {
    type: String,
    select: false,
  },

  resetPasswordExpires: {
    type: Date,
    select: false,
  },

  resetPasswordLastSentAt: {
    type: Date,
    default: null,
  },

  resetPasswordAttempts: {
    type: Number,
    default: 0,
  },

 resetPasswordLockedUntil: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
