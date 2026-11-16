const express = require("express");
const { createDM } = require("../controllers/dmController");
const {
  listConversations,
  listEligibleUsers,
  createConversation,
  listMessages,
  sendMessage,
  reportMessage,
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
  router.get("/eligible-users", listEligibleUsers);
  router.post("/", createConversation);
  router.post("/dm", createDM);
  router.get("/:id/messages", listMessages);
  router.post("/:id/messages", sendMessage);
  router.post("/:id/messages/:messageId/reports", reportMessage);

  return router;
};

module.exports = createConversationRouter;
