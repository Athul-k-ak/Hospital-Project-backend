const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ["Male", "Female", "Other"] },
  qualification: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ["Nurse", "Technician", "Lab Assistant", "Pharmacist", "Cleaner", "Security"] // Exclude Doctor, Reception, Admin
  },
  phone: { type: String, required: true, unique: true },
  place: { type: String, required: true },
  profileImage: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Staff", staffSchema);
