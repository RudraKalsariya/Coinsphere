// Backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// connect DB
const connectDB = require("./Config/db");
const userRouter = require("./routes/user");

const app = express();

// CORS: allow Vite frontend origin
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.json()); // parse JSON request bodies

// Connect database
connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* -------------------------------
   Utility: auto-handle default export
-------------------------------- */
function loadRouter(pathStr) {
  const router = require(pathStr);
  return router?.default ? router.default : router;
}

/* ---------------------------------
   Mount all API routes here
----------------------------------- */   // Authentication routes
app.use("/api/auth", loadRouter("./routes/Auth"));   // auth routes
app.use("/api/user", loadRouter("./routes/user"));   // user routes (single mount)
/* ---------------------------------
   Health check endpoint
----------------------------------- */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    backend: "CoinSphere API running",
    time: new Date().toISOString(),
  });
});

/* ---------------------------------
   Server start
----------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listening at http://localhost:${PORT}`);
});
