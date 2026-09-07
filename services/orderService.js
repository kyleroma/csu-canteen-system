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
