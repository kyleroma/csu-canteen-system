require("dotenv").config();
const path = require("path");
const fs = require("fs");
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

// In production the built React app is served by this same server, so the
// browser talks to one origin and there is no CORS. Locally the folder does
// not exist until npm run build in client/, so we check before wiring it up.
const clientDist = path.join(__dirname, "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // React Router owns every non-/api path, so anything that reached this far
  // gets index.html and the router decides. This is a middleware, not
  // app.get("") — Express 5 rejects a bare "" as a route pattern.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
