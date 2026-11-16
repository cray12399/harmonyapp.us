const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { searchUsers } = require("../controllers/userController");

// GET /api/users/search?q=harmony
router.get("/search", authMiddleware, searchUsers);

module.exports = router;
