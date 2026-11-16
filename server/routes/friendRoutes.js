
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { sendFriendRequest, acceptFriendRequest, listFriends, removeFriend,
} = require("../controllers/friendController");

const router = express.Router();

router.use(authMiddleware);

router.post("/requests", sendFriendRequest);
router.patch("/requests/:requestId/accept", acceptFriendRequest);
router.get("/", listFriends);
router.delete("/:friendshipId", removeFriend);

module.exports = router;
