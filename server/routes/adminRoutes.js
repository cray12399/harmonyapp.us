const express = require("express");
const {
  listUsers,
  updateUserStatus,
  createAdminUser,
  setUserPassword,
  updateAllUserStatuses,
  listReports,
  resolveReport,
  removeMessage,
} = require("../controllers/adminController");

const createAdminRouter = ({ requireAuth, requireAdmin }) => {
  // These functions are supplied when the router is mounted. Refuse to create
  // admin routes if either security check is missing.
  if (
    typeof requireAuth !== "function" ||
    typeof requireAdmin !== "function"
  ) {
    throw new TypeError("Admin routes require authentication middleware");
  }

  const router = express.Router();

  // For every route below: identify the caller first, then check admin status.
  // If either check rejects the request, the controller does not run.
  router.use(requireAuth, requireAdmin);

  router.get("/users", listUsers);
  router.post("/users", createAdminUser);
  router.patch("/users/bulk-status", updateAllUserStatuses);
  router.patch("/users/:id/password", setUserPassword);
  router.patch("/users/:id", updateUserStatus);
  router.get("/reports", listReports);
  router.patch("/reports/:id", resolveReport);
  router.delete("/messages/:id", removeMessage);

  return router;
};

module.exports = createAdminRouter;
