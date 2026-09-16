"use strict";

module.exports = {
  async up(queryInterface) {
    // Legacy CHECK from the original hand-written SQL schema.
    // The CSU-email rule is now role-dependent and enforced in the
    // User model, so a database-wide constraint is no longer correct.
    await queryInterface.sequelize.query(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_csu_email;",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD CONSTRAINT chk_csu_email CHECK (email LIKE '%@carsu.edu.ph');",
    );
  },
};
