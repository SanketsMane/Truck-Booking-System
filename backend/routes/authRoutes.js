const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleWare/middleWare");
const { authLimiter } = require("../middleWare/rateLimit");

router.post("/request-otp", authController.requestOtp);
router.post("/verify-otp", authController.verifyOtp);
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
