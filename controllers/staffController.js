const Staff = require("../models/Staff");
const cloudinary = require("../config/cloudinary");


const addStaff = async (req, res) => {
  try {
    console.log("🔍 Received Request to Add Staff");

    // Log request fields (without profileImage)
    console.log("🛠️ Request Body:", {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      qualification: req.body.qualification,
      role: req.body.role,
      phone: req.body.phone,
      place: req.body.place,
    });

    const { name, age, gender, qualification, role, phone, place } = req.body;

    if (!name || !age || !gender || !qualification || !role || !phone || !place) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("🔍 Checking if phone number already exists");
    const staffExists = await Staff.findOne({ phone });

    if (staffExists) {
      return res.status(400).json({ message: "Phone number already exists. Please use a different number." });
    }

    // ✅ Handle Profile Image Upload to Cloudinary
    let profileImage = null;
    if (req.file) {
      console.log("🔍 Uploading profile image to Cloudinary...");
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "hospital_dashboard/staff",
      });
      profileImage = uploadedImage.secure_url;
      console.log("✅ Profile image uploaded:", profileImage);
    }

    console.log("✅ Creating Staff");
    const staff = new Staff({
      name,
      age,
      gender,
      qualification,
      role,
      phone,
      place,
      profileImage, // Store Cloudinary URL in DB
    });

    await staff.save();

    console.log("✅ Staff Added Successfully:", {
      _id: staff.id,
      name: staff.name,
      phone: staff.phone,
      profileImage: staff.profileImage,
    });

    res.status(201).json({
      message: "Staff added successfully",
      staff: {
        _id: staff.id,
        name: staff.name,
        phone: staff.phone,
        profileImage: staff.profileImage,
      },
    });
  } catch (error) {
    console.error("❌ Add Staff Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

  module.exports = { addStaff };

// ✅ Edit Staff (Only Admin)
const editStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const updatedData = req.body;

    const updatedStaff = await Staff.findByIdAndUpdate(staffId, updatedData, { new: true });

    if (!updatedStaff) return res.status(404).json({ message: "Staff not found" });

    res.json({ message: "Staff updated successfully", updatedStaff });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Delete Staff (Only Admin)
const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findByIdAndDelete(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    res.json({ message: "Staff deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ List All Staff (Only Admin)
const listStaff = async (req, res) => {
  try {
    const staffList = await Staff.find();
    res.json({ staff: staffList });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { addStaff, editStaff, deleteStaff, listStaff };
