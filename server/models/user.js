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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: "Must be a valid email address" },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
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
      validate: {
        // Students must hold a CSU account. Vendors and admins may not.
        studentsUseCsuEmail() {
          if (
            this.role === "STUDENT" &&
            !String(this.email).endsWith("@carsu.edu.ph")
          ) {
            throw new Error(
              "Students must register with a @carsu.edu.ph email address.",
            );
          }
        },
      },
    },
  );

  User.associate = (models) => {
    User.hasOne(models.Vendor, { foreignKey: "user_id" });
    User.hasMany(models.Order, { foreignKey: "student_id" });
  };

  return User;
};
