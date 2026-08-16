const express = require("express");

const router = express.Router();

const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleWare/middleWare");
const { requireRole } = require("../middleWare/middleWare");

router.get("/search", tripController.searchTrips);
router.get("/popular-routes", tripController.popularRoutes);
router.get("/me", authMiddleware, requireRole("transporter"), tripController.listMyTrips);
router.post("/search-alerts", authMiddleware, tripController.saveSearchAlert);

router.post("/", authMiddleware, requireRole("transporter"), tripController.postTrip);
router.get("/:id", tripController.getTrip);
router.put("/:id", authMiddleware, requireRole("transporter"), tripController.editTrip);
router.delete("/:id", authMiddleware, requireRole("transporter"), tripController.cancelTrip);

module.exports = router;
