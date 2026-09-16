const express = require("express");
const router = express.Router();
const vendorOrderController = require("../controllers/vendorOrderController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("VENDOR"));

router.get("/", vendorOrderController.queue);
router.get("/summary", vendorOrderController.dailySummary);
router.patch("/:id/status", vendorOrderController.advanceStatus);

module.exports = router;
