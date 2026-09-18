require("dotenv").config();

// Philippine Standard Time. Our timestamp columns are "without time zone",
// so Sequelize must write and read wall-clock PH time rather than
// converting to UTC — otherwise a 5:00 PM slot is stored as 09:00.
const timezone = "+08:00";

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    timezone,
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    timezone,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
