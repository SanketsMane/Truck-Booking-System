const express = require("express");

const router = express.Router();

const truckController = require("../controllers/truckController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope, requireRole } = require("../middleWare/middleWare");

router.post("/", authMiddleware, requireRole("transporter"), truckController.registerTruck);
router.get("/me", authMiddleware, requireRole("transporter"), truckController.listMyTrucks);
router.put("/:id", authMiddleware, requireRole("transporter"), truckController.updateTruck);
router.post("/:id/documents", authMiddleware, requireRole("transporter"), truckController.addDocuments);
router.post("/:id/photos", authMiddleware, requireRole("transporter"), truckController.addPhotos);

router.get("/queue", authMiddleware, requireAdmin, truckController.listQueue);
router.put("/:id/review", authMiddleware, requireAdminScope("verification"), truckController.reviewTruck);

module.exports = router;
