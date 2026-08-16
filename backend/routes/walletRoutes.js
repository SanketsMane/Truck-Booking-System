const express = require("express");

const router = express.Router();

const walletController = require("../controllers/walletController");
const authMiddleware = require("../middleWare/middleWare");
const { requireRole } = require("../middleWare/middleWare");

router.get("/me", authMiddleware, walletController.getMyWallet);
router.get("/transactions", authMiddleware, walletController.listMyTransactions);

router.post("/recharge/order", authMiddleware, walletController.createRechargeOrder);
router.post("/recharge/verify", authMiddleware, walletController.verifyRecharge);

router.post("/withdrawals", authMiddleware, requireRole("transporter"), walletController.requestWithdrawal);
router.get("/withdrawals", authMiddleware, requireRole("transporter"), walletController.listMyWithdrawals);

router.get("/payout-method", authMiddleware, requireRole("transporter"), walletController.getMyPayoutMethod);
router.put("/payout-method", authMiddleware, requireRole("transporter"), walletController.savePayoutMethod);

module.exports = router;
