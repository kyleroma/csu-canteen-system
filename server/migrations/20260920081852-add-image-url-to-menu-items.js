"use strict";

/**
 * Menu photos are stored as a link, not an uploaded file. Render's disk is
 * ephemeral, so uploads would vanish on every redeploy, and a real upload
 * pipeline means external storage plus resizing plus validation. A URL field
 * gets the benefit of photos without any of that infrastructure.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("menu_items", "image_url", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("menu_items", "image_url");
  },
};
