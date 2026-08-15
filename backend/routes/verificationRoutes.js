const express = require("express");

const router = express.Router();

const verificationController = require("../controllers/verificationController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope } = require("../middleWare/middleWare");

router.post("/", authMiddleware, verificationController.submitVerification);
router.get("/me", authMiddleware, verificationController.getMyVerifications);

router.get("/queue", authMiddleware, requireAdmin, verificationController.listQueue);
router.put("/:id/review", authMiddleware, requireAdminScope("verification"), verificationController.reviewVerification);

module.exports = router;
