const db = require("../models");
const { MenuItem, Vendor } = db;

// Resolve the vendor record belonging to the logged-in user
async function getMyVendor(userId) {
  const vendor = await Vendor.findOne({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error("No stall is linked to this account.");
    err.code = "NO_VENDOR";
    throw err;
  }
  return vendor;
}

exports.listMyMenu = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const items = await MenuItem.findAll({
      where: { vendor_id: vendor.vendor_id },
      order: [["item_id", "ASC"]],
    });
    return res.json({ stall: vendor.stall_name, items });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not load menu." });
  }
};

exports.createItem = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const { name, category, price, stock_qty, image_url } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price are required." });
    }
    if (Number(price) < 0) {
      return res.status(400).json({ message: "Price cannot be negative." });
    }

    const qty = Number(stock_qty) || 0;

    const item = await MenuItem.create({
      vendor_id: vendor.vendor_id,
      name,
      category: category || null,
      price,
      image_url: image_url || null,
      stock_qty: qty,
      is_sold_out: qty === 0,
    });

    return res.status(201).json({ message: "Menu item created.", item });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not create item." });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) return res.status(404).json({ message: "Item not found." });

    // ownership check — a vendor may only touch their own items
    if (item.vendor_id !== vendor.vendor_id) {
      return res
        .status(403)
        .json({ message: "This item belongs to another stall." });
    }

    const {
      name,
      category,
      price,
      stock_qty,
      is_sold_out,
      is_active,
      image_url,
    } = req.body;

    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (price !== undefined) item.price = price;
    if (is_active !== undefined) item.is_active = is_active;
    // An empty string clears the photo, which is how a vendor removes one
    if (image_url !== undefined) item.image_url = image_url || null;

    if (stock_qty !== undefined) {
      const qty = Number(stock_qty);
      if (qty < 0)
        return res.status(400).json({ message: "Stock cannot be negative." });
      item.stock_qty = qty;
      if (qty === 0) item.is_sold_out = true;
      if (qty > 0 && is_sold_out === undefined) item.is_sold_out = false;
    }

    if (is_sold_out !== undefined) item.is_sold_out = is_sold_out;

    await item.save();
    return res.json({ message: "Menu item updated.", item });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not update item." });
  }
};

exports.toggleSoldOut = async (req, res) => {
  try {
    const vendor = await getMyVendor(req.user.user_id);
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) return res.status(404).json({ message: "Item not found." });
    if (item.vendor_id !== vendor.vendor_id) {
      return res
        .status(403)
        .json({ message: "This item belongs to another stall." });
    }

    item.is_sold_out = !item.is_sold_out;
    await item.save();

    return res.json({
      message: item.is_sold_out ? "Marked sold out." : "Marked available.",
      item: {
        item_id: item.item_id,
        name: item.name,
        is_sold_out: item.is_sold_out,
      },
    });
  } catch (err) {
    if (err.code === "NO_VENDOR")
      return res.status(404).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: "Could not toggle item." });
  }
};
