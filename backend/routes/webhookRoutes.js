const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhookController");

// No authMiddleware — this is a server-to-server callback from Razorpay,
// authenticated by its HMAC signature (checked inside the controller), not
// a cookie session. csrfOriginCheck (mounted globally in server.js) doesn't
// block it either: that middleware only rejects requests with a present
// *and* mismatched Origin header, and Razorpay's webhook sends none.
router.post("/razorpay", webhookController.handleRazorpayWebhook);

module.exports = router;
