const express = require("express");

const router = express.Router();

const ratingController = require("../controllers/ratingController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope } = require("../middleWare/middleWare");

router.post("/", authMiddleware, ratingController.submitRating);
router.get("/user/:userId", ratingController.listRatingsForUser);
router.get("/flagged", authMiddleware, requireAdmin, ratingController.listFlaggedRatings);
router.put("/:id/flag", authMiddleware, ratingController.flagRating);
router.put("/:id/moderate", authMiddleware, requireAdminScope("support"), ratingController.moderateRating);

module.exports = router;
