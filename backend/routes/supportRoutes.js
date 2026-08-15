const express = require("express");

const router = express.Router();

const supportController = require("../controllers/supportController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope } = require("../middleWare/middleWare");

router.post("/", authMiddleware, supportController.createSupportRequest);
router.get("/me", authMiddleware, supportController.listMySupportRequests);

router.get("/", authMiddleware, requireAdmin, supportController.listAllSupportRequests);
router.put("/:id/resolve", authMiddleware, requireAdminScope("support"), supportController.resolveSupportRequest);

module.exports = router;
