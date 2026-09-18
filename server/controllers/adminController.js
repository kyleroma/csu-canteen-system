const bcrypt = require("bcryptjs");
const db = require("../models");
const { Vendor, User, Order, sequelize } = db;

exports.listVendors = async (req, res) => {
  try {
    const vendors = await Vendor.findAll({
      include: [{ model: User, attributes: ["email", "phone", "full_name"] }],
      order: [["vendor_id", "ASC"]],
    });
    return res.json({ vendors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load vendors." });
  }
};

exports.verifyVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Stall not found." });

    vendor.is_verified = true;
    await vendor.save();

    return res.json({
      message: `${vendor.stall_name} is now verified and visible to students.`,
      vendor: {
        vendor_id: vendor.vendor_id,
        stall_name: vendor.stall_name,
        is_verified: true,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not verify stall." });
  }
};

exports.setStallActive = async (req, res) => {
  try {
    const { is_open } = req.body;
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Stall not found." });

    vendor.is_open = is_open === true;
    await vendor.save();

    return res.json({
      message: `${vendor.stall_name} is now ${vendor.is_open ? "OPEN" : "CLOSED"}.`,
      vendor: { vendor_id: vendor.vendor_id, is_open: vendor.is_open },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not update stall." });
  }
};

// Attach a stall to an EXISTING vendor account.
exports.registerStall = async (req, res) => {
  try {
    const { user_id, stall_name, location } = req.body;

    if (!user_id || !stall_name) {
      return res
        .status(400)
        .json({ message: "user_id and stall_name are required." });
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role !== "VENDOR") {
      return res.status(400).json({ message: "That account is not a vendor." });
    }

    const existing = await Vendor.findOne({ where: { user_id } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "That account already owns a stall." });
    }

    const vendor = await Vendor.create({
      user_id,
      stall_name,
      location: location || null,
      is_open: true,
      is_verified: false,
    });

    return res
      .status(201)
      .json({ message: "Stall created, pending verification.", vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not create stall." });
  }
};

// Create the vendor ACCOUNT and its stall together, in one transaction.
// Either both rows exist or neither does — a vendor login with no stall
// would break every vendor screen, since each one resolves the stall first.
exports.onboardVendor = async (req, res) => {
  const { email, password, full_name, phone, stall_name, location } = req.body;

  if (!email || !password || !full_name || !stall_name) {
    return res.status(400).json({
      message: "Email, password, owner name, and stall name are required.",
    });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters." });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          email,
          phone: phone || null,
          password_hash,
          full_name,
          role: "VENDOR",
        },
        { transaction: t },
      );

      const vendor = await Vendor.create(
        {
          user_id: user.user_id,
          stall_name,
          location: location || null,
          is_open: true,
          is_verified: false,
        },
        { transaction: t },
      );

      return { user, vendor };
    });

    return res.status(201).json({
      message: `${stall_name} created. Verify it to make it visible to students.`,
      vendor: {
        vendor_id: result.vendor.vendor_id,
        stall_name: result.vendor.stall_name,
        location: result.vendor.location,
        is_open: result.vendor.is_open,
        is_verified: result.vendor.is_verified,
        User: {
          email: result.user.email,
          phone: result.user.phone,
          full_name: result.user.full_name,
        },
      },
    });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error(err);
    return res.status(500).json({ message: "Could not onboard the vendor." });
  }
};

exports.overview = async (req, res) => {
  try {
    const [users, vendors, orders] = await Promise.all([
      User.count(),
      Vendor.count(),
      Order.count(),
    ]);
    const pending = await Vendor.count({ where: { is_verified: false } });

    return res.json({
      total_users: users,
      total_stalls: vendors,
      unverified_stalls: pending,
      total_orders: orders,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not load overview." });
  }
};
