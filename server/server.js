console.log("TEST LOG: Server file is actively executing!");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");
const createAdminRouter = require("./routes/adminRoutes");
const createConversationRouter = require("./routes/conversationRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/admin", createAdminRouter({ requireAuth, requireAdmin }));
app.use("/api/conversations", createConversationRouter({ requireAuth }));

app.get("/api/ping", (req, res) => {
  res.status(200).json({
    message: "Harmony API is running",
  });
});

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Harmony API running on port ${PORT}`);
  });
};

// Importing the app for tests must not connect to the production database.
if (require.main === module) {
  startServer();
}

module.exports = app;
