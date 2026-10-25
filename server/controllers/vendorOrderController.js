const db = require("../models");
const { Order, OrderItem, MenuItem, Vendor, User, PickupSlot } = db;
const { Op } = db.Sequelize;

const TRANSITIONS = {
  PENDING: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["CLAIMED"],
  CLAIMED: [],
  CANCELLED: [],
};

const ACTIVE = ["PENDING", "PREPARING", "READY"];

async function getMyVendor(userId) {
  const vendor = await Vendor.findOne({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error("No stall is linked to this account.");
    err.code = "NO_VENDOR";
    throw err;
  }
  return vendor;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

exports.queue = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const { status } = req.query;

    const where = {
      vendor_id: vendor.vendor_id,
      [Op.or]: [
        { status: { [Op.in]: ACTIVE } },
        { placed_at: { [Op.gte]: startOfToday() } },
      ],
    };
    if (status) where.status = status.toUpperCase();

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: "student", attributes: ["full_name", "email"] },
        { model: PickupSlot, attributes: ["start_time", "end_time"] },
        {
          model: OrderItem,
          as: "items",
          include: [{ model: MenuItem, attributes: ["name"] }],
        },
      ],
      order: [["placed_at", "ASC"]],
    });

    const grouped = {
      PENDING: [],
      PREPARING: [],
      READY: [],
      CLAIMED: [],
      CANCELLED: [],
    };
    orders.forEach((o) => grouped[o.status].push(o));

    return res.json({
      stall: vendor.stall_name,
      counts: Object.fromEntries(
        Object.entries(grouped).map(([k, v]) => [k, v.length]),
      ),
      orders: status ? orders : grouped,
    });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not load order queue." });
  }
};

exports.advanceStatus = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const next = String(req.body.status || "").toUpperCase();
    const orderId = Number(req.params.id);

    if (!next) {
      return res.status(400).json({ message: "A new status is required." });
    }
    if (!Number.isInteger(orderId)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const result = await db.sequelize.transaction(async (t) => {
      const order = await Order.findOne({
        where: { order_id: orderId, vendor_id: vendor.vendor_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        return { code: 404, body: { message: "Order not found." } };
      }

      const allowed = TRANSITIONS[order.status] || [];
      if (!allowed.includes(next)) {
        return {
          code: 409,
          body: {
            message: `Cannot move an order from ${order.status} to ${next}.`,
            code: "ILLEGAL_TRANSITION",
            allowed,
          },
        };
      }

      order.status = next;
      await order.save({ transaction: t });

      return {
        code: 200,
        body: {
          message: `Order ${order.order_code} is now ${next}.`,
          order: {
            order_id: order.order_id,
            order_code: order.order_code,
            status: order.status,
          },
        },
      };
    });

    return res.status(result.code).json(result.body);
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not update order." });
  }
};

exports.dailySummary = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);

    const start = startOfToday();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await Order.findAll({
      where: {
        vendor_id: vendor.vendor_id,
        placed_at: { [Op.between]: [start, end] },
      },
    });

    const claimed = orders.filter((o) => o.status === "CLAIMED");
    const revenue = claimed.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return res.json({
      stall: vendor.stall_name,
      date: start.toISOString().slice(0, 10),
      orders_today: orders.length,
      claimed_today: claimed.length,
      revenue_today: revenue.toFixed(2),
    });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not load summary." });
  }
};
