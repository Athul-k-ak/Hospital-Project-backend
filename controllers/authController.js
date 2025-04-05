const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const Reception = require("../models/Reception");
const Staff = require("../models/Staff");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;
    let role = null;

    // Check if user exists in any of the models
    user = await Admin.findOne({ email });
    if (user) role = "admin";

    if (!user) {
      user = await Doctor.findOne({ email });
      if (user) role = "doctor";
    }

    if (!user) {
      user = await Reception.findOne({ email });
      if (user) role = "reception";
    }

    if (!user) {
      user = await Staff.findOne({ email });
      if (user) role = "staff";
    }

    // If no user is found
    if (!user) return res.status(401).json({ message: "Invalid Credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid Credentials" });

    // Generate JWT token
    const token = generateToken(user._id, role);

    // Store token in HTTP-only cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Send response
    res.json({
      message: "Login Successful",
      user: { id: user._id, name: user.name, email: user.email, role },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Logout Function (Clears JWT from Cookies)
exports.logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0), // Set expiration to remove cookie
  });

  res.json({ message: "Logged out successfully" });
};


exports.getProfile = async (req, res) => {
  try {
    const { jwt: token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;

    if (decoded.role === "admin") user = await Admin.findById(decoded.id);
    if (decoded.role === "doctor") user = await Doctor.findById(decoded.id);
    if (decoded.role === "reception") user = await Reception.findById(decoded.id);
    if (decoded.role === "staff") user = await Staff.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ id: user._id, name: user.name, email: user.email, role: decoded.role });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
exports.checkAdminExists = async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    res.json({ adminExists: adminCount > 0 });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
