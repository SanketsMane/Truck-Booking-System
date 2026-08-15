const express = require("express");

const router = express.Router();

const disputeController = require("../controllers/disputeController");
const authMiddleware = require("../middleWare/middleWare");

router.post("/", authMiddleware, disputeController.raiseDispute);
router.get("/me", authMiddleware, disputeController.listMyDisputes);

module.exports = router;
