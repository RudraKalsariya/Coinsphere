// Backend/Config/db.js
const mongoose = require("mongoose");

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) not set in .env");

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
};
