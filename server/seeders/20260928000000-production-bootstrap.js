"use strict";

const bcrypt = require("bcryptjs");

const ACCOUNTS = [
  { email: "admin@carsu.edu.ph", full_name: "Canteen Admin", role: "ADMIN" },
  { email: "student1@carsu.edu.ph", full_name: "Demo Student", role: "STUDENT" },
  { email: "demo.vendor@carsu.edu.ph", full_name: "Aling Nena", role: "VENDOR" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const password_hash = await bcrypt.hash("password123", 10);

    const users = await queryInterface.bulkInsert(
      "users",
      ACCOUNTS.map((a) => ({
        ...a,
        phone: null,
        password_hash,
        created_at: now,
        updated_at: now,
      })),
      { returning: ["user_id", "role"] },
    );

    const vendorUser = users.find((u) => u.role === "VENDOR");

    const [vendor] = await queryInterface.bulkInsert(
      "vendors",
      [
        {
          user_id: vendorUser.user_id,
          stall_name: "DEMO STALL - Aling Nena's Carinderia",
          location: "Main Canteen, Stall 5",
          is_open: true,
          is_verified: true,
          created_at: now,
          updated_at: now,
        },
      ],
      { returning: ["vendor_id"] },
    );

    const item = (name, category, price, stock_qty) => ({
      vendor_id: vendor.vendor_id,
      name,
      category,
      price,
      stock_qty,
      is_sold_out: stock_qty === 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    await queryInterface.bulkInsert("menu_items", [
      item("Pork Sisig", "Rice Meal", 75.0, 15),
      item("Tapsilog", "Rice Meal", 65.0, 20),
      item("Chicken Adobo", "Rice Meal", 70.0, 1),
      item("Buko Juice", "Drink", 25.0, 15),
      item("Iced Tea", "Drink", 20.0, 0),
    ]);
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT user_id FROM users WHERE email IN (:emails);",
      { replacements: { emails: ACCOUNTS.map((a) => a.email) } },
    );
    const ids = rows.map((r) => r.user_id);
    if (ids.length === 0) return;

    await queryInterface.sequelize.query(
      "DELETE FROM menu_items WHERE vendor_id IN (SELECT vendor_id FROM vendors WHERE user_id IN (:ids));",
      { replacements: { ids } },
    );
    await queryInterface.bulkDelete("vendors", { user_id: ids });
    await queryInterface.bulkDelete("users", { user_id: ids });
  },
};
