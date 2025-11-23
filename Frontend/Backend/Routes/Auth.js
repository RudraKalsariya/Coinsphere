// Backend/routes/Auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// helper: sign JWT
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: "1h",
  });
}

/**
 * SIGNUP
 */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash: hashed });
    await user.save();

    const token = signToken(user._id);

    // return token + user (frontend expects res.data.user)
    res.status(201).json({
      message: "User created",
      token,
      user: { name: user.name, email: user.email, _id: user._id },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.passwordHash || "");
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    const token = signToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email, _id: user._id },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
