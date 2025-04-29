// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
const kkRoutes = require("./routes/kkRoutes");
app.use("/api/kk", kkRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("✅ Backend berjalan di Railway!");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
