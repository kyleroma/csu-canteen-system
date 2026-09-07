"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Vendor accounts already exist from Sprint 1 registration.
    // Look up their user_ids rather than hardcoding.
    const [users] = await queryInterface.sequelize.query(
      "SELECT user_id, csu_email FROM users WHERE role = 'VENDOR' ORDER BY user_id;",
    );

    if (users.length === 0) {
      throw new Error(
        "No VENDOR users found. Register a vendor account first.",
      );
    }

    const vendorUserId = users[0].user_id;

    await queryInterface.bulkInsert("vendors", [
      {
        user_id: vendorUserId,
        stall_name: "Stall 3 - Silog Corner",
        location: "Main Canteen",
        is_open: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    const [vendors] = await queryInterface.sequelize.query(
      "SELECT vendor_id FROM vendors ORDER BY vendor_id DESC LIMIT 1;",
    );
    const vendorId = vendors[0].vendor_id;

    await queryInterface.bulkInsert("menu_items", [
      {
        vendor_id: vendorId,
        name: "Tapsilog",
        category: "Rice Meal",
        price: 65.0,
        stock_qty: 20,
        is_sold_out: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      {
        vendor_id: vendorId,
        name: "Longsilog",
        category: "Rice Meal",
        price: 60.0,
        stock_qty: 15,
        is_sold_out: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // stock of 1 — this is the concurrency test case
      {
        vendor_id: vendorId,
        name: "Chicken Adobo",
        category: "Rice Meal",
        price: 70.0,
        stock_qty: 1,
        is_sold_out: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // already sold out — tests the unavailable path
      {
        vendor_id: vendorId,
        name: "Iced Tea",
        category: "Drink",
        price: 20.0,
        stock_qty: 0,
        is_sold_out: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    const slot = (h, m) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    await queryInterface.bulkInsert("pickup_slots", [
      {
        vendor_id: vendorId,
        start_time: slot(10, 0),
        end_time: slot(10, 15),
        capacity: 10,
        booked_count: 0,
        created_at: now,
        updated_at: now,
      },

      // already full — tests the slot-unavailable path
      {
        vendor_id: vendorId,
        start_time: slot(10, 15),
        end_time: slot(10, 30),
        capacity: 10,
        booked_count: 10,
        created_at: now,
        updated_at: now,
      },

      {
        vendor_id: vendorId,
        start_time: slot(12, 0),
        end_time: slot(12, 15),
        capacity: 15,
        booked_count: 3,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("pickup_slots", null, {});
    await queryInterface.bulkDelete("menu_items", null, {});
    await queryInterface.bulkDelete("vendors", null, {});
  },
};
