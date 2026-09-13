const db = require('../models');
const { Vendor, User, Order } = db;

exports.listVendors = async (req, res) => {
  try {
    const vendors = await Vendor.findAll({
      include: [{ model: User, attributes: ['email', 'phone', 'full_name'] }],
      order: [['vendor_id', 'ASC']]
    });
    return res.json({ vendors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not load vendors.' });
  }
};

exports.verifyVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Stall not found.' });

    vendor.is_verified = true;
    await vendor.save();

    return res.json({
      message: `${vendor.stall_name} is now verified and visible to students.`,
      vendor: {
        vendor_id: vendor.vendor_id,
        stall_name: vendor.stall_name,
        is_verified: true
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not verify stall.' });
  }
};

exports.setStallActive = async (req, res) => {
  try {
    const { is_open } = req.body;
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Stall not found.' });

    vendor.is_open = is_open === true;
    await vendor.save();

    return res.json({
      message: `${vendor.stall_name} is now ${vendor.is_open ? 'OPEN' : 'CLOSED'}.`,
      vendor: { vendor_id: vendor.vendor_id, is_open: vendor.is_open }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not update stall.' });
  }
};

exports.registerStall = async (req, res) => {
  try {
    const { user_id, stall_name, location } = req.body;

    if (!user_id || !stall_name) {
      return res.status(400).json({ message: 'user_id and stall_name are required.' });
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'VENDOR') {
      return res.status(400).json({ message: 'That account is not a vendor.' });
    }

    const existing = await Vendor.findOne({ where: { user_id } });
    if (existing) {
      return res.status(409).json({ message: 'That account already owns a stall.' });
    }

    const vendor = await Vendor.create({
      user_id,
      stall_name,
      location: location || null,
      is_open: true,
      is_verified: false
    });

    return res.status(201).json({ message: 'Stall created, pending verification.', vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not create stall.' });
  }
};

exports.overview = async (req, res) => {
  try {
    const [users, vendors, orders] = await Promise.all([
      User.count(),
      Vendor.count(),
      Order.count()
    ]);
    const pending = await Vendor.count({ where: { is_verified: false } });

    return res.json({
      total_users: users,
      total_stalls: vendors,
      unverified_stalls: pending,
      total_orders: orders
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not load overview.' });
  }
};