const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Doctor = require("../models/Doctor");
const Reception = require("../models/Reception");

const getUserById = async (id) => {
  let user = await Admin.findById(id).select("-password");
  if (!user) user = await Doctor.findById(id).select("-password");
  if (!user) user = await Reception.findById(id).select("-password");

  if (!user) {
    console.log("❌ User not found in the database for ID:", id);
  } else {
    // console.log("✅ User found in database:", user);
  }

  return user;
};

const protect = async (req, res, next) => {
  let token = req.cookies.jwt; // Get token from cookies

  if (!token) {
    console.log("❌ No Token Provided");
    return res.status(401).json({ message: "No Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("✅ Decoded Token:", decoded); // Debugging

    req.user = await getUserById(decoded.id);

    if (!req.user) {
      console.log("❌ User Not Found in Database");
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`✅ Authenticated User: Name: ${req.user.name}, Role: ${req.user.role}`);

    // console.log("✅ User Role (Middleware):", req.user.role); // Ensure role exists

    if (!req.user.role) {
      return res.status(500).json({ message: "Role is missing in database" });
    }

    next();
  } catch (error) {
    console.error("❌ Token Error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token Expired" });
    }
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = protect;
