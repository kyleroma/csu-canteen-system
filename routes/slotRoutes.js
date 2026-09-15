const express = require("express");
const router = express.Router();
const slotController = require("../controllers/slotController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("VENDOR"));

router.get("/", slotController.listMySlots);
router.post("/generate", slotController.generateSlots);
router.patch("/:id", slotController.updateSlot);
router.delete("/:id", slotController.deleteSlot);

module.exports = router;
