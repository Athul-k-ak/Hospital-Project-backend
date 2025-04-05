const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["admin"], default: "admin" },  // 🔹 Ensure role is stored
  profileImage: { type: String },
});

module.exports = mongoose.model("Admin", adminSchema);
