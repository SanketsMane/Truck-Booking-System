const express = require("express");

const router = express.Router();

const truckController = require("../controllers/truckController");
const truckDeletionController = require("../controllers/truckDeletionController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope, requireRole } = require("../middleWare/middleWare");

router.post("/", authMiddleware, requireRole("transporter"), truckController.registerTruck);
router.get("/me", authMiddleware, requireRole("transporter"), truckController.listMyTrucks);
router.put("/:id", authMiddleware, requireRole("transporter"), truckController.updateTruck);
router.post("/:id/documents", authMiddleware, requireRole("transporter"), truckController.addDocuments);
router.post("/:id/photos", authMiddleware, requireRole("transporter"), truckController.addPhotos);

router.get("/delete-requests/me", authMiddleware, requireRole("transporter"), truckDeletionController.listMyDeleteRequests);
router.post("/:id/delete-request", authMiddleware, requireRole("transporter"), truckDeletionController.raiseDeleteRequest);

router.get("/queue", authMiddleware, requireAdmin, truckController.listQueue);
router.put("/:id/review", authMiddleware, requireAdminScope("verification"), truckController.reviewTruck);

module.exports = router;
