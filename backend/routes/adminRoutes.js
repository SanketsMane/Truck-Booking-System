const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");
const integrationController = require("../controllers/integrationController");
const adminWalletController = require("../controllers/adminWalletController");
const disputeController = require("../controllers/disputeController");
const authMiddleware = require("../middleWare/middleWare");
const { requireAdmin, requireAdminScope } = require("../middleWare/middleWare");

router.use(authMiddleware, requireAdmin);

router.get("/dashboard", adminController.getDashboard);

router.get("/integrations", integrationController.getIntegrations);
router.put("/integrations/sms", requireAdminScope("full"), integrationController.updateSms);
router.post("/integrations/sms/test", requireAdminScope("full"), integrationController.testSms);
router.put("/integrations/email", requireAdminScope("full"), integrationController.updateEmail);
router.post("/integrations/email/test", requireAdminScope("full"), integrationController.testEmail);
router.put("/integrations/razorpay", requireAdminScope("full"), integrationController.updateRazorpay);
router.post("/integrations/razorpay/test", requireAdminScope("full"), integrationController.testRazorpay);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.put("/users/:id/status", requireAdminScope("full"), adminController.setUserStatus);
router.put("/users/:id/admin-role", requireAdminScope("full"), adminController.setAdminRole);

router.get("/live-trips", adminController.listLiveTrips);
router.get("/trucks", adminController.listTrucks);
router.get("/trips", adminController.listTrips);
router.put("/trips/:id/deactivate", requireAdminScope("full"), adminController.deactivateTrip);

router.get("/bookings", adminController.listBookings);
router.put("/bookings/:id/force-cancel", requireAdminScope("full"), adminController.forceCancelBooking);

router.get("/settings", adminController.getSettings);
router.put("/settings", requireAdminScope("full"), adminController.updateSettings);
router.put("/settings/commission", requireAdminScope("finance"), adminController.updateCommission);

router.get("/payments", adminWalletController.listPayments);

router.get("/wallets", adminWalletController.listWallets);
router.post("/wallets/:userId/adjust", requireAdminScope("finance"), adminWalletController.adjustWallet);

router.get("/platform-wallet", adminWalletController.getPlatformWallet);
router.get("/platform-wallet/transactions", adminWalletController.listPlatformWalletTransactions);

router.get("/withdrawals", adminWalletController.listWithdrawals);
router.put("/withdrawals/:id/approve", requireAdminScope("finance"), adminWalletController.approveWithdrawal);
router.put("/withdrawals/:id/reject", requireAdminScope("finance"), adminWalletController.rejectWithdrawal);
router.put("/withdrawals/:id/mark-paid", requireAdminScope("finance"), adminWalletController.markWithdrawalPaid);

router.get("/disputes", disputeController.listAllDisputes);
router.put("/disputes/:id/resolve", requireAdminScope("support"), disputeController.resolveDispute);

router.get("/reports/bookings.csv", adminController.exportBookingsCsv);
router.get("/reports/revenue-by-route.csv", adminController.exportRevenueByRouteCsv);
router.get("/reports/user-growth.csv", adminController.exportUserGrowthCsv);
router.get("/reports/verification-turnaround.csv", adminController.exportVerificationTurnaroundCsv);

module.exports = router;
