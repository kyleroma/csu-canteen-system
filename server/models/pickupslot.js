"use strict";

module.exports = (sequelize, DataTypes) => {
  const PickupSlot = sequelize.define(
    "PickupSlot",
    {
      slot_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: false },
      capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      booked_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "pickup_slots",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  PickupSlot.associate = (models) => {
    PickupSlot.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    PickupSlot.hasMany(models.Order, { foreignKey: "slot_id" });
  };

  return PickupSlot;
};
