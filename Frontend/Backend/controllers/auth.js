// controllers/auth.js (signup)
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const secret = process.env.JWT_SECRET || "your_jwt_secret_here";

async function signup(req, res) {
  const { name, email, password } = req.body;
  // create user, hash password, etc...
  const user = new User({ name, email, passwordHash: hashed });
  await user.save();
  const token = jwt.sign({ id: user._id }, secret, { expiresIn: "7d" });
  res.json({ token, user: { name: user.name, email: user.email, walletAddress: user.walletAddress } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  // validate password
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user._id }, secret, { expiresIn: "7d" });
  res.json({ token, user: { name: user.name, email: user.email, walletAddress: user.walletAddress }});
}
