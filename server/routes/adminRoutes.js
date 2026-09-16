const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("ADMIN"));

router.get("/overview", adminController.overview);
router.get("/vendors", adminController.listVendors);
router.post("/vendors", adminController.registerStall);
router.patch("/vendors/:id/verify", adminController.verifyVendor);
router.patch("/vendors/:id/status", adminController.setStallActive);

module.exports = router;
