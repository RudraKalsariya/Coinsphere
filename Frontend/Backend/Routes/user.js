// Backend/routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware"); // your protect middleware

// GET /api/user/me  (protected)
router.get("/me", protect, async (req, res) => {
  try {
    const u = req.user;
    // note: protect middleware already fetched the user as req.user
    res.json({
      name: u.name || null,
      email: u.email || null,
      walletAddress: u.walletAddress || null,
      walletCreatedAt: u.walletCreatedAt || null,
      txs: u.txs || [],
    });
  } catch (err) {
    console.error("GET /api/user/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/account  (protected) - save/update account info (NOT privateKey)
router.post("/account", protect, async (req, res) => {
  try {
    const { name, email, walletAddress, walletCreatedAt } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (typeof name === "string" && name.trim() !== "") user.name = name.trim();
    if (typeof email === "string" && email.trim() !== "") user.email = email.trim();
    // initialize balances only if user did not have any
if (!user.balances || user.balances.size === 0) {
    user.balances = new Map([
        ["ETH", 0],
        ["BTC", 0],
        ["USDT", 0],
    ]);
}
      user.walletAddress = walletAddress.trim();
    if (walletCreatedAt) user.walletCreatedAt = new Date(walletCreatedAt);

    await user.save();

    res.json({
      message: "Account updated",
      account: {
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress || null,
        walletCreatedAt: user.walletCreatedAt || null,
          balances: u.balances ? Object.fromEntries(u.balances) : {},
          txs: u.txs || [],
      },
    });
  } catch (err) {
    console.error("POST /api/user/account error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
