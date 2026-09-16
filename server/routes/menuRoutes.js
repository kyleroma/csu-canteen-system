const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("VENDOR"));

router.get("/", menuController.listMyMenu);
router.post("/", menuController.createItem);
router.patch("/:id", menuController.updateItem);
router.patch("/:id/sold-out", menuController.toggleSoldOut);

module.exports = router;
