const db = require('../models');
const { Order, OrderItem, MenuItem, Vendor, User, PickupSlot } = db;

// Legal one-step forward transitions
const TRANSITIONS = {
  PENDING:   ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['CLAIMED', 'CANCELLED'],
  CLAIMED:   [],
  CANCELLED: []
};

async function getMyVendor(userId) {
  const vendor = await Vendor.findOne({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('No stall is linked to this account.');
    err.code = 'NO_VENDOR';
    throw err;
  }
  return vendor;
}

exports.queue = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const { status } = req.query;

    const where = { vendor_id: vendor.vendor_id };
    if (status) where.status = status.toUpperCase();

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['full_name', 'email'] },
        { model: PickupSlot, attributes: ['start_time', 'end_time'] },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: MenuItem, attributes: ['name'] }]
        }
      ],
      order: [['placed_at', 'ASC']]
    });

    // group by status so the dashboard can render columns directly
    const grouped = { PENDING: [], PREPARING: [], READY: [], CLAIMED: [], CANCELLED: [] };
    orders.forEach(o => grouped[o.status].push(o));

    return res.json({
      stall: vendor.stall_name,
      counts: Object.fromEntries(
        Object.entries(grouped).map(([k, v]) => [k, v.length])
      ),
      orders: status ? orders : grouped
    });
  } catch (err) {
    if (err.code === 'NO_VENDOR') return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Could not load order queue.' });
  }
};

exports.advanceStatus = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'A new status is required.' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.vendor_id !== vendor.vendor_id) {
      return res.status(403).json({ message: 'This order belongs to another stall.' });
    }

    const next = status.toUpperCase();
    const allowed = TRANSITIONS[order.status] || [];

    if (!allowed.includes(next)) {
      return res.status(409).json({
        message: `Cannot move an order from ${order.status} to ${next}.`,
        code: 'ILLEGAL_TRANSITION',
        allowed
      });
    }

    order.status = next;
    await order.save();

    return res.json({
      message: `Order ${order.order_code} is now ${next}.`,
      order: {
        order_id: order.order_id,
        order_code: order.order_code,
        status: order.status
      }
    });
  } catch (err) {
    if (err.code === 'NO_VENDOR') return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Could not update order.' });
  }
};

exports.dailySummary = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);

    const orders = await Order.findAll({
      where: {
        vendor_id: vendor.vendor_id,
        placed_at: { [db.Sequelize.Op.between]: [start, end] }
      }
    });

    const claimed = orders.filter(o => o.status === 'CLAIMED');
    const revenue = claimed.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return res.json({
      stall: vendor.stall_name,
      date: start.toISOString().slice(0, 10),
      orders_today: orders.length,
      claimed_today: claimed.length,
      revenue_today: revenue.toFixed(2)
    });
  } catch (err) {
    if (err.code === 'NO_VENDOR') return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Could not load summary.' });
  }
};