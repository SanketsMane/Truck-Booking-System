const express = require("express");

const router = express.Router();

const metaController = require("../controllers/metaController");

router.get("/cities", metaController.listCities);
router.get("/vapid-public-key", metaController.getVapidPublicKey);
router.get("/branding", metaController.getBranding);
router.get("/mobile-config", metaController.getMobileConfig);

module.exports = router;
