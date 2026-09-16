"use strict";

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      student_id: { type: DataTypes.INTEGER, allowNull: false },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      slot_id: { type: DataTypes.INTEGER, allowNull: false },
      order_code: { type: DataTypes.STRING, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PREPARING",
          "READY",
          "CLAIMED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      placed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "orders",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, { foreignKey: "student_id", as: "student" });
    Order.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    Order.belongsTo(models.PickupSlot, { foreignKey: "slot_id" });
    Order.hasMany(models.OrderItem, { foreignKey: "order_id", as: "items" });
  };

  return Order;
};
