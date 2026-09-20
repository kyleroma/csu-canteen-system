"use strict";

module.exports = (sequelize, DataTypes) => {
  const MenuItem = sequelize.define(
    "MenuItem",
    {
      item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      category: DataTypes.STRING,
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      stock_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_sold_out: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      // A link, not an uploaded file — see the migration for why
      image_url: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      tableName: "menu_items",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  MenuItem.associate = (models) => {
    MenuItem.belongsTo(models.Vendor, { foreignKey: "vendor_id" });
    MenuItem.hasMany(models.OrderItem, { foreignKey: "item_id" });
  };

  return MenuItem;
};
