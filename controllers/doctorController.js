const Doctor = require("../models/Doctor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");


// Register Doctor (Only Admin can add)
const registerDoctor = async (req, res) => {
  try {
    console.log("🔍 Received Request to Register Doctor");
    console.log("🛠️ Request Body:", { ...req.body, password: "********" });

    console.log("🛠️ Request File:", req.file);

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied" });
    }

    // ✅ Extract fields from FormData
    const { name, email, password, phone, specialty, qualification } = req.body;
    
    // ✅ Parse JSON fields (availableDays & availableTime are sent as text)
    const availableDays = req.body.availableDays ? JSON.parse(req.body.availableDays) : [];
    const availableTime = req.body.availableTime ? JSON.parse(req.body.availableTime) : [];

    if (!name || !email || !password || !phone || !specialty || !qualification || !availableDays.length || !availableTime.length) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("🔹 Processed Data:", { name, email, phone, specialty, qualification, availableDays, availableTime });

    // 🔍 Check if doctor already exists
    const doctorExists = await Doctor.findOne({ email });
    if (doctorExists) return res.status(400).json({ message: "Doctor already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Upload profile image if provided
    let profileImage = null;
    if (req.file) {
      console.log("🔍 Uploading profile image to Cloudinary...");
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, { folder: "hospital_dashboard/doctors" });
      profileImage = uploadedImage.secure_url;
      console.log("✅ Profile image uploaded:", profileImage);
    }

    // ✅ Save Doctor to DB
    const doctor = await Doctor.create({
      name,
      email,
      password: hashedPassword,
      phone,
      specialty,
      qualification,
      availableDays,
      availableTime,
      profileImage,
    });

    console.log("✅ Doctor Registered Successfully");
    res.status(201).json({
      _id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      profileImage: doctor.profileImage,
    });
  } catch (error) {
    console.error("❌ Register Doctor Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Login Doctor
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate required fields.
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // ✅ Find the doctor by email.
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ Ensure a password exists and compare.
    if (!doctor.password) {
      return res.status(500).json({ message: "Doctor password is missing in database" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT token with role "doctor"
    const token = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // ✅ Store JWT in HTTP-only cookie
    res
      .cookie("jwt", token, {
        httpOnly: true, // Prevents access from JavaScript (More Secure)
        secure: process.env.NODE_ENV === "production", // Secure only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
      })
      .json({
        _id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        role: "doctor",
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


// Get all Doctors (Accessible by Admin & Reception)
const getDoctors = async (req, res) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
    return res.status(403).json({ message: "Access Denied" });
  }
  
  const doctors = await Doctor.find({});
  res.json(doctors);
};

const getDoctorById = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateDoctor = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Extract fields from the request body
    const { name, email, phone, specialty, qualification, availableDays, availableTime } = req.body;

    // Update fields if provided
    if (name) doctor.name = name;
    if (email) doctor.email = email;
    if (phone) doctor.phone = phone;
    if (specialty) doctor.specialty = specialty;
    if (qualification) doctor.qualification = qualification;
    if (availableDays) doctor.availableDays = JSON.parse(availableDays);
    if (availableTime) doctor.availableTime = JSON.parse(availableTime);

    // ✅ Handle Profile Image Upload
    if (req.file) {
      console.log("🔍 Uploading new profile image to Cloudinary...");
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, { folder: "hospital_dashboard/doctors" });
      doctor.profileImage = uploadedImage.secure_url;
      console.log("✅ Profile image updated:", doctor.profileImage);
    }

    // Save updated doctor details
    await doctor.save();
    res.status(200).json({ message: "Doctor updated successfully", doctor });

  } catch (error) {
    console.error("❌ Error updating doctor:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


module.exports = { registerDoctor, loginDoctor, getDoctors,getDoctorById, logout,updateDoctor };
