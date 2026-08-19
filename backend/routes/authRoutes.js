const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleWare/middleWare");
const { authLimiter, otpLimiter } = require("../middleWare/rateLimit");

router.post("/request-otp", otpLimiter, authController.requestOtp);
router.post("/check-otp", otpLimiter, authController.checkOtp);
router.post("/verify-otp", otpLimiter, authController.verifyOtp);
router.post("/logout", authMiddleware, authController.logout);

router.post("/signup", authLimiter, authController.signup);
router.post("/login-password", authLimiter, authController.loginPassword);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.put("/set-password", authMiddleware, authController.setPassword);

router.post("/roles", authMiddleware, authController.addRole);
router.post("/refresh", authMiddleware, authController.refreshToken);
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);

module.exports = router;
