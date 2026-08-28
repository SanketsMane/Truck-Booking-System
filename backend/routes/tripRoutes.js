const express = require("express");

const router = express.Router();

const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleWare/middleWare");
const { requireRole, optionalAuthMiddleware } = require("../middleWare/middleWare");

// Public — a logged-out visitor must still be able to search. optionalAuth
// only attaches req.auth WHEN there's a valid session, so the search
// analytics log can attribute the search to a real user (and to their role)
// instead of counting every signed-in shipper as an anonymous visitor.
// Nothing in searchTrips itself reads req.auth.
router.get("/search", optionalAuthMiddleware, tripController.searchTrips);
router.get("/popular-routes", tripController.popularRoutes);
router.get("/me", authMiddleware, requireRole("transporter"), tripController.listMyTrips);
router.post("/search-alerts", authMiddleware, tripController.saveSearchAlert);

router.post("/", authMiddleware, requireRole("transporter"), tripController.postTrip);
router.get("/:id", tripController.getTrip);
router.put("/:id", authMiddleware, requireRole("transporter"), tripController.editTrip);
router.delete("/:id", authMiddleware, requireRole("transporter"), tripController.cancelTrip);

module.exports = router;
