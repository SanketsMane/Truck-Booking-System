const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");
const integrationController = require("../controllers/integrationController");
const disputeController = require("../controllers/disputeController");
const chatController = require("../controllers/chatController");
const auditLogController = require("../controllers/auditLogController");
const truckDeletionController = require("../controllers/truckDeletionController");
const postController = require("../controllers/postController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope } = require("../middleWare/middleWare");

router.use(authMiddleware, requireAdmin);

router.get("/dashboard", adminController.getDashboard);

router.get("/integrations", integrationController.getIntegrations);
router.put("/integrations/sms", requireAdminScope("full"), integrationController.updateSms);
router.post("/integrations/sms/test", requireAdminScope("full"), integrationController.testSms);
router.put("/integrations/email", requireAdminScope("full"), integrationController.updateEmail);
router.post("/integrations/email/test", requireAdminScope("full"), integrationController.testEmail);
router.put("/integrations/kyc", requireAdminScope("full"), integrationController.updateKyc);

router.get("/users", adminController.listUsers);
router.post("/users", requireAdminScope("full"), adminController.createUser);
router.get("/users/:id", adminController.getUserDetail);
router.put("/users/:id/status", requireAdminScope("full"), adminController.setUserStatus);
router.put("/users/:id/admin-role", requireAdminScope("full"), adminController.setAdminRole);
router.delete("/users/:id", requireAdminScope("full"), adminController.deleteUser);

router.get("/trucks", adminController.listTrucks);
router.delete("/trucks/:id", requireAdminScope("full"), truckDeletionController.deleteTruckDirect);
router.get("/truck-delete-requests", truckDeletionController.listAllDeleteRequests);
router.put("/truck-delete-requests/:id/resolve", requireAdminScope("full"), truckDeletionController.resolveDeleteRequest);
router.get("/deleted-trucks", truckDeletionController.listDeletedTrucks);
router.get("/trips", adminController.listTrips);
router.put("/trips/:id/deactivate", requireAdminScope("full"), adminController.deactivateTrip);

router.get("/bookings", adminController.listBookings);
router.put("/bookings/:id/force-cancel", requireAdminScope("full"), adminController.forceCancelBooking);

router.get("/settings", adminController.getSettings);
router.put("/settings", requireAdminScope("full"), adminController.updateSettings);
router.put("/settings/mobile-config", requireAdminScope("full"), adminController.updateMobileConfig);
router.put("/settings/branding", requireAdminScope("full"), adminController.updateBranding);

router.get("/disputes", disputeController.listAllDisputes);
router.put("/disputes/:id/resolve", requireAdminScope("support"), disputeController.resolveDispute);

// SRS-06.1 — admin can read a booking's chat for moderation (e.g. reviewing
// a dispute). Same scope dispute resolution requires, since that's the
// primary reason an admin would need this.
router.get("/bookings/:bookingId/chat", requireAdminScope("support"), chatController.adminGetThread);

router.get("/posts", postController.listAdminPosts);
router.get("/posts/:id", postController.getAdminPost);
router.post("/posts", requireAdminScope("content"), postController.createPost);
router.put("/posts/:id", requireAdminScope("content"), postController.updatePost);
router.put("/posts/:id/publish", requireAdminScope("content"), postController.publishPost);
router.put("/posts/:id/unpublish", requireAdminScope("content"), postController.unpublishPost);
router.put("/posts/:id/archive", requireAdminScope("content"), postController.archivePost);
router.delete("/posts/:id", requireAdminScope("full"), postController.deletePost);

router.get("/audit-logs", auditLogController.listAuditLogs);

router.get("/reports/bookings.csv", adminController.exportBookingsCsv);
router.get("/reports/bookings-by-route.csv", adminController.exportBookingsByRouteCsv);
router.get("/reports/user-growth.csv", adminController.exportUserGrowthCsv);
router.get("/reports/verification-turnaround.csv", adminController.exportVerificationTurnaroundCsv);

module.exports = router;
