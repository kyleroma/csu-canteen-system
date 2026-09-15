const db = require("../models");
const { PickupSlot, Vendor, Order } = db;
const { Op } = db.Sequelize;

async function getMyVendor(userId) {
  const vendor = await Vendor.findOne({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error("No stall is linked to this account.");
    err.code = "NO_VENDOR";
    throw err;
  }
  return vendor;
}

exports.listMySlots = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const slots = await PickupSlot.findAll({
      where: {
        vendor_id: vendor.vendor_id,
        start_time: { [Op.between]: [start, end] },
      },
      order: [["start_time", "ASC"]],
    });

    return res.json({
      stall: vendor.stall_name,
      slots: slots.map((s) => ({
        slot_id: s.slot_id,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity,
        booked_count: s.booked_count,
        remaining: s.capacity - s.booked_count,
        is_full: s.booked_count >= s.capacity,
      })),
    });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not load slots." });
  }
};

// Generate a run of slots: "open 10:00 to 14:00, 15-min windows, capacity 10"
exports.generateSlots = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const { open_time, close_time, interval_minutes, capacity } = req.body;

    if (!open_time || !close_time) {
      return res
        .status(400)
        .json({ message: "Open and close times are required." });
    }

    const interval = Number(interval_minutes) || 15;
    const cap = Number(capacity) || 10;

    if (interval < 5 || interval > 120) {
      return res
        .status(400)
        .json({ message: "Interval must be between 5 and 120 minutes." });
    }
    if (cap < 1) {
      return res.status(400).json({ message: "Capacity must be at least 1." });
    }

    // "HH:MM" today, in server local time
    const build = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const open = build(open_time);
    const close = build(close_time);

    if (close <= open) {
      return res
        .status(400)
        .json({ message: "Closing time must be after opening time." });
    }

    const existing = await PickupSlot.findAll({
      where: {
        vendor_id: vendor.vendor_id,
        start_time: { [Op.between]: [open, close] },
      },
    });
    const taken = new Set(
      existing.map((s) => new Date(s.start_time).getTime()),
    );

    const rows = [];
    let cursor = new Date(open);

    while (cursor < close) {
      const end = new Date(cursor.getTime() + interval * 60000);
      if (end > close) break;

      if (!taken.has(cursor.getTime())) {
        rows.push({
          vendor_id: vendor.vendor_id,
          start_time: new Date(cursor),
          end_time: end,
          capacity: cap,
          booked_count: 0,
        });
      }
      cursor = end;
    }

    if (rows.length === 0) {
      return res.status(409).json({ message: "Those slots already exist." });
    }

    const created = await PickupSlot.bulkCreate(rows);

    return res.status(201).json({
      message: `${created.length} pickup slots created.`,
      count: created.length,
    });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not create slots." });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const slot = await PickupSlot.findByPk(req.params.id);

    if (!slot) return res.status(404).json({ message: "Slot not found." });
    if (slot.vendor_id !== vendor.vendor_id) {
      return res
        .status(403)
        .json({ message: "That slot belongs to another stall." });
    }

    const { capacity } = req.body;
    if (capacity === undefined) {
      return res.status(400).json({ message: "Capacity is required." });
    }

    const cap = Number(capacity);
    if (cap < slot.booked_count) {
      return res.status(409).json({
        message: `Capacity cannot be below ${slot.booked_count} — that many orders are already booked.`,
      });
    }

    slot.capacity = cap;
    await slot.save();

    return res.json({ message: "Slot updated.", slot });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not update slot." });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const slot = await PickupSlot.findByPk(req.params.id);

    if (!slot) return res.status(404).json({ message: "Slot not found." });
    if (slot.vendor_id !== vendor.vendor_id) {
      return res
        .status(403)
        .json({ message: "That slot belongs to another stall." });
    }

    const orders = await Order.count({ where: { slot_id: slot.slot_id } });
    if (orders > 0) {
      return res.status(409).json({
        message: "This slot has orders and cannot be removed.",
      });
    }

    await slot.destroy();
    return res.json({ message: "Slot removed." });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not remove slot." });
  }
};
