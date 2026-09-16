"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("orders", {
      order_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onDelete: "RESTRICT",
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "vendors", key: "vendor_id" },
        onDelete: "RESTRICT",
      },
      slot_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "pickup_slots", key: "slot_id" },
        onDelete: "RESTRICT",
      },
      order_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM(
          "PENDING",
          "PREPARING",
          "READY",
          "CLAIMED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      placed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("orders", ["vendor_id", "status"]);
    await queryInterface.addIndex("orders", ["student_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("orders");
  },
};
