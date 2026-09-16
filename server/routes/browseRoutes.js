const express = require("express");
const router = express.Router();
const browseController = require("../controllers/browseController");
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.get("/stalls", browseController.listStalls);
router.get("/stalls/:id/menu", browseController.stallMenu);
router.get("/stalls/:id/slots", browseController.stallSlots);

module.exports = router;
