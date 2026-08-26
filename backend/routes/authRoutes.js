const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleWare/middleWare");
const { authLimiter, otpLimiter } = require("../middleWare/rateLimit");

router.post("/request-otp", otpLimiter, authController.requestOtp);
router.post("/check-otp", otpLimiter, authController.checkOtp);
router.post("/verify-otp", otpLimiter, authController.verifyOtp);
router.post("/logout", authMiddleware, authController.logout);

// Mobile bearer-token pair — proof of holding the refresh token is the
// auth here (not a valid access token/cookie), so neither needs
// authMiddleware; both are still behind authLimiter, same brute-force
// protection every other credential-adjacent auth route gets.
router.post("/mobile/refresh", authLimiter, authController.mobileRefresh);
router.post("/mobile/logout", authLimiter, authController.mobileLogout);

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
