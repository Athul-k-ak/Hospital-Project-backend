const mongoose = require("mongoose");

const bloodBankSchema = new mongoose.Schema({
  donorName: String,
  bloodGroup: String,
  age: Number,
  phone: String,
  gender: String,
  quantity: Number, // Quantity in units
});

module.exports = mongoose.model("BloodBank", bloodBankSchema);
