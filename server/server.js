require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/browse", require("./routes/browseRoutes"));
app.use("/api/vendor/menu", require("./routes/menuRoutes"));
app.use("/api/vendor/orders", require("./routes/vendorOrderRoutes"));
app.use("/api/vendor/slots", require("./routes/slotRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// health check — proves the server is alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CSU Canteen API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
