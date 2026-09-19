const db = require("../models");
const { sequelize, MenuItem, PickupSlot, Order, OrderItem } = db;

function generateOrderCode() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${stamp}-${random}`;
}

exports.createOrder = async (studentId, slotId, cartItems) => {
  return await sequelize.transaction(async (t) => {
    const slot = await PickupSlot.findByPk(slotId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!slot) {
      const err = new Error("Pickup slot not found.");
      err.code = "SLOT_NOT_FOUND";
      throw err;
    }

    if (slot.booked_count >= slot.capacity) {
      const err = new Error("This pickup slot is already full.");
      err.code = "SLOT_FULL";
      throw err;
    }

    let total = 0;
    const lines = [];

    for (const line of cartItems) {
      const item = await MenuItem.findByPk(line.item_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!item || !item.is_active) {
        const err = new Error("Item not available.");
        err.code = "ITEM_NOT_FOUND";
        throw err;
      }

      if (item.is_sold_out) {
        const err = new Error(`${item.name} is sold out.`);
        err.code = "ITEM_SOLD_OUT";
        throw err;
      }

      if (item.stock_qty < line.quantity) {
        const err = new Error(
          `Not enough stock for ${item.name}. Requested ${line.quantity}, only ${item.stock_qty} left.`,
        );
        err.code = "INSUFFICIENT_STOCK";
        throw err;
      }

      if (item.vendor_id !== slot.vendor_id) {
        const err = new Error(
          "All items must come from the same stall as the pickup slot.",
        );
        err.code = "VENDOR_MISMATCH";
        throw err;
      }

      item.stock_qty -= line.quantity;
      if (item.stock_qty === 0) item.is_sold_out = true;
      await item.save({ transaction: t });

      const unitPrice = Number(item.price);
      total += unitPrice * line.quantity;

      lines.push({
        item_id: item.item_id,
        quantity: line.quantity,
        unit_price: unitPrice,
      });
    }

    slot.booked_count += 1;
    await slot.save({ transaction: t });

    const order = await Order.create(
      {
        student_id: studentId,
        vendor_id: slot.vendor_id,
        slot_id: slot.slot_id,
        order_code: generateOrderCode(),
        status: "PENDING",
        total_amount: total,
      },
      { transaction: t },
    );

    await OrderItem.bulkCreate(
      lines.map((l) => ({ ...l, order_id: order.order_id })),
      { transaction: t },
    );

    return order;
  });
};

// Cancelling is createOrder run backwards, and it needs the same protection:
// stock returns, the slot frees a place, and the status changes together or
// not at all. The order row is locked first so two taps on Cancel cannot
// both pass the PENDING check and return the stock twice.
exports.cancelOrder = async (studentId, orderId) => {
  return await sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      const err = new Error("Order not found.");
      err.code = "ORDER_NOT_FOUND";
      throw err;
    }

    if (order.student_id !== studentId) {
      const err = new Error("That order belongs to another student.");
      err.code = "NOT_YOUR_ORDER";
      throw err;
    }

    if (order.status === "CANCELLED") {
      const err = new Error("This order is already cancelled.");
      err.code = "ALREADY_CANCELLED";
      throw err;
    }

    // Once the vendor starts cooking, the food is committed.
    if (order.status !== "PENDING") {
      const err = new Error(
        "This order can no longer be cancelled — the stall has already started preparing it.",
      );
      err.code = "TOO_LATE_TO_CANCEL";
      throw err;
    }

    const lines = await OrderItem.findAll({
      where: { order_id: order.order_id },
      transaction: t,
    });

    for (const line of lines) {
      const item = await MenuItem.findByPk(line.item_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // The item may have been deleted since; the rest of the cancel still stands.
      if (!item) continue;

      item.stock_qty += line.quantity;
      if (item.stock_qty > 0) item.is_sold_out = false;
      await item.save({ transaction: t });
    }

    const slot = await PickupSlot.findByPk(order.slot_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (slot && slot.booked_count > 0) {
      slot.booked_count -= 1;
      await slot.save({ transaction: t });
    }

    order.status = "CANCELLED";
    await order.save({ transaction: t });

    return order;
  });
};
