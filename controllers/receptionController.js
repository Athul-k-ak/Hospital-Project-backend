const Reception = require("../models/Reception");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// Register Reception
const registerReception = async (req, res) => {
  try {
    console.log("🔍 Received Request to Register Receptionist");

    // ✅ Ensure only Admins can add a Receptionist
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied. Only admins can add receptionists." });
    }

    console.log("🛠️ Request Body:", {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    });

    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("🔍 Checking if Receptionist already exists");
    const receptionExists = await Reception.findOne({ email });

    if (receptionExists) {
      return res.status(400).json({ message: "Receptionist already exists" });
    }

    console.log("✅ Hashing Password");
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Handle Profile Image Upload to Cloudinary
    let profileImage = null;
    if (req.file) {
      console.log("🔍 Uploading profile image to Cloudinary...");
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "hospital_dashboard/receptions",
      });
      profileImage = uploadedImage.secure_url;
      console.log("✅ Profile image uploaded:", profileImage);
    }

    console.log("✅ Creating Receptionist");
    const reception = await Reception.create({
      name,
      email,
      password: hashedPassword,
      phone,
      profileImage, // Store Cloudinary URL in DB
    });

    console.log("✅ Receptionist Registered Successfully:", {
      _id: reception.id,
      name: reception.name,
      email: reception.email,
      profileImage: reception.profileImage,
    });

    res.status(201).json({
      _id: reception.id,
      name: reception.name,
      email: reception.email,
      profileImage: reception.profileImage,
    });
  } catch (error) {
    console.error("❌ Register Receptionist Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Login Reception
const loginReception = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // ✅ Find reception staff by email
    const reception = await Reception.findOne({ email });
    if (!reception) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ Check password validity
    const isMatch = await bcrypt.compare(password, reception.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT token with role "reception"
    const token = jwt.sign({ id: reception.id, role: "reception" }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // ✅ Store JWT in an HTTP-only cookie
    res
      .cookie("jwt", token, {
        httpOnly: true, // Secure: Prevents JavaScript access
        secure: process.env.NODE_ENV === "production", // Enables secure cookies in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 24 * 60 * 60 * 1000, // Token expires in 1 day
      })
      .json({
        _id: reception.id,
        name: reception.name,
        email: reception.email,
        role: "reception",
      });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
const logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0), // Set expiration to remove cookie
  });

  res.json({ message: "Logged out successfully" });
};




// Get all Receptionists
const getReceptions = async (req, res) => {
  try {
    // ✅ Ensure only Admins can access the list
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied. Only admins can view receptionists." });
    }

    // console.log("🔍 Fetching all receptionists");
    const receptions = await Reception.find().select("-password"); // Exclude password for security

    console.log(`✅ ${req.user.name} (${req.user.role}) fetched receptionists`);
;
    res.json(receptions);
  } catch (error) {
    console.error("❌ Get Receptionists Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { registerReception, loginReception, getReceptions, logout };
