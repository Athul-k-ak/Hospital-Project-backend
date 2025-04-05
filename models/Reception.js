const mongoose = require("mongoose");

const receptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: "reception" }, // Ensure role is set
  profileImage: { type: String },
});

module.exports = mongoose.model("Reception", receptionSchema);
