"use strict";

module.exports = (sequelize, DataTypes) => {
  const Vendor = sequelize.define(
    "Vendor",
    {
      vendor_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      stall_name: { type: DataTypes.STRING, allowNull: false },
      location: DataTypes.STRING,
      is_open: { type: DataTypes.BOOLEAN, defaultValue: true },
      is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "vendors",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  Vendor.associate = (models) => {
    Vendor.belongsTo(models.User, { foreignKey: "user_id" });
    Vendor.hasMany(models.MenuItem, { foreignKey: "vendor_id" });
    Vendor.hasMany(models.PickupSlot, { foreignKey: "vendor_id" });
    Vendor.hasMany(models.Order, { foreignKey: "vendor_id" });
  };

  return Vendor;
};
