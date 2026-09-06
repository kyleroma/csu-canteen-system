"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      csu_email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: "Must be a valid email address" },
          isCsuEmail(value) {
            if (!value.endsWith("@carsu.edu.ph")) {
              throw new Error("Only @carsu.edu.ph email addresses are allowed");
            }
          },
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("STUDENT", "VENDOR", "ADMIN"),
        allowNull: false,
        defaultValue: "STUDENT",
      },
    },
    {
      tableName: "users",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return User;
};
