const orderService = require("../services/orderService");
const db = require("../models");

exports.placeOrder = async (req, res) => {
  try {
    const { slot_id, items } = req.body;

    if (!slot_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "A pickup slot and at least one item are required.",
      });
    }

    const order = await orderService.createOrder(
      req.user.user_id,
      slot_id,
      items,
    );

    return res.status(201).json({
      message: "Order placed successfully.",
      order: {
        order_id: order.order_id,
        order_code: order.order_code,
        status: order.status,
        total_amount: order.total_amount,
        slot_id: order.slot_id,
      },
    });
  } catch (err) {
    const clientErrors = [
      "SLOT_NOT_FOUND",
      "SLOT_FULL",
      "ITEM_NOT_FOUND",
      "ITEM_SOLD_OUT",
      "INSUFFICIENT_STOCK",
      "VENDOR_MISMATCH",
    ];

    if (clientErrors.includes(err.code)) {
      return res.status(409).json({ message: err.message, code: err.code });
    }

    console.error(err);
    return res.status(500).json({ message: "Could not place order." });
  }
};

exports.myOrders = async (req, res) => {
  try {
    const orders = await db.Order.findAll({
      where: { student_id: req.user.user_id },
      include: [
        { model: db.PickupSlot, attributes: ["start_time", "end_time"] },
        { model: db.Vendor, attributes: ["stall_name", "location"] },
        {
          model: db.OrderItem,
          as: "items",
          include: [{ model: db.MenuItem, attributes: ["name"] }],
        },
      ],
      order: [["placed_at", "DESC"]],
    });

    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load orders." });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancelOrder(
      req.user.user_id,
      req.params.id,
    );

    return res.json({
      message: "Order cancelled. The stock has been returned to the stall.",
      order: {
        order_id: order.order_id,
        order_code: order.order_code,
        status: order.status,
      },
    });
  } catch (err) {
    if (err.code === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: err.message, code: err.code });
    }

    // Another student's order: 404, not 403 — a 403 would confirm the id exists.
    if (err.code === "NOT_YOUR_ORDER") {
      return res
        .status(404)
        .json({ message: "Order not found.", code: err.code });
    }

    if (["ALREADY_CANCELLED", "TOO_LATE_TO_CANCEL"].includes(err.code)) {
      return res.status(409).json({ message: err.message, code: err.code });
    }

    console.error(err);
    return res.status(500).json({ message: "Could not cancel the order." });
  }
};
