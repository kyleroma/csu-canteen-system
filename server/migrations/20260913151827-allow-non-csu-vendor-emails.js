"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn("users", "csu_email", "email");

    await queryInterface.addColumn("users", "phone", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "phone");
    await queryInterface.renameColumn("users", "email", "csu_email");
  },
};
