const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  patientName: { type: String, required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  paymentTransactionId: { type: String }, // New field to store transaction id
  billingDate: { type: Date, default: Date.now },
  details: { type: String }
});

module.exports = mongoose.model("Billing", billingSchema);
