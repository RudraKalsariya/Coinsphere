// middleware/auth.js
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "your_jwt_secret_here";

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  const parts = authHeader.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "Invalid token" });
  const token = parts[1];

  try {
    const payload = jwt.verify(token, secret);
    req.userId = payload.id; // ensure your login generates { id: user._id } in token
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid" });
  }
};
