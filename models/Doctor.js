const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  specialty: { type: String, required: true },
  qualification: { type: String, required: true },
  availableDays: { type: [String], required: true },
  availableTime: { type: [String], required: true },
  role: { type: String, enum: ["doctor"], default: "doctor" }, // ✅ Add role
  profileImage: { type: String },
});

module.exports = mongoose.model("Doctor", doctorSchema);
