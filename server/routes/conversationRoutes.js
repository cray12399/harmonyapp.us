const express = require("express");
const {
  listConversations,
  createGroup,
  listMessages,
  sendMessage,
} = require("../controllers/conversationController");

const createConversationRouter = ({ requireAuth }) => {
  // Refuse to create these routes without authentication middleware.
  if (typeof requireAuth !== "function") {
    throw new TypeError("Conversation routes require authentication middleware");
  }

  const router = express.Router();

  // Every request must first pass authentication. The controllers then check
  // membership for requests involving a particular conversation.
  router.use(requireAuth);

  router.get("/", listConversations);
  router.post("/", createGroup);
  router.get("/:id/messages", listMessages);
  router.post("/:id/messages", sendMessage);

  return router;
};

module.exports = createConversationRouter;
