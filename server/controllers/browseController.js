const db = require("../models");
const { Vendor, MenuItem, PickupSlot, User } = db;
const { Op } = db.Sequelize;

exports.listStalls = async (req, res) => {
  try {
    const stalls = await Vendor.findAll({
      where: { is_verified: true },
      attributes: ["vendor_id", "stall_name", "location", "is_open"],
      order: [["stall_name", "ASC"]],
    });
    return res.json({ stalls });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load stalls." });
  }
};

exports.stallMenu = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id, {
      attributes: ["vendor_id", "stall_name", "location", "is_open"],
    });

    if (!vendor) return res.status(404).json({ message: "Stall not found." });

    const items = await MenuItem.findAll({
      where: { vendor_id: vendor.vendor_id, is_active: true },
      attributes: [
        "item_id",
        "name",
        "category",
        "price",
        "stock_qty",
        "is_sold_out",
        "image_url",
      ],
      order: [
        ["category", "ASC"],
        ["name", "ASC"],
      ],
    });

    // tell the client what it needs, not raw stock counts
    const menu = items.map((i) => ({
      item_id: i.item_id,
      name: i.name,
      category: i.category,
      price: i.price,
      image_url: i.image_url,
      available: !i.is_sold_out && i.stock_qty > 0,
      stock_left: i.stock_qty,
    }));

    return res.json({ stall: vendor, menu });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load menu." });
  }
};

exports.stallSlots = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Stall not found." });

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await PickupSlot.findAll({
      where: {
        vendor_id: vendor.vendor_id,
        start_time: { [Op.between]: [now, endOfDay] },
      },
      order: [["start_time", "ASC"]],
    });

    const available = slots.map((s) => ({
      slot_id: s.slot_id,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      remaining: s.capacity - s.booked_count,
      is_full: s.booked_count >= s.capacity,
    }));

    return res.json({ stall: vendor.stall_name, slots: available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load pickup slots." });
  }
};
