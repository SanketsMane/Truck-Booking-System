const express = require("express");

const router = express.Router();

const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleWare/middleWare");
const { optionalAuthMiddleware } = require("../middleWare/middleWare");
const upload = require("../middleWare/upload");
const { uploadLimiter } = require("../middleWare/rateLimit");

router.post("/", authMiddleware, uploadLimiter, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, msg: err.message });
    }
    next();
  });
}, fileController.uploadFile);

// Optional auth — a public truck photo is servable to a logged-out visitor;
// a private KYC document still needs req.auth for the owner-or-admin check
// inside getFile.
router.get("/:id", optionalAuthMiddleware, fileController.getFile);

module.exports = router;
