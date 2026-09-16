const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.post(
  "/",
  verifyToken,
  requireRole("STUDENT"),
  orderController.placeOrder,
);
router.get(
  "/mine",
  verifyToken,
  requireRole("STUDENT"),
  orderController.myOrders,
);

module.exports = router;
