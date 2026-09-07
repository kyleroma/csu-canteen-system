"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("orders", "order_code", {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("orders", "order_code", {
      type: Sequelize.STRING(12),
      allowNull: false,
    });
  },
};
