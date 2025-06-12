const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  patientName: { type: String, required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
  amount: { type: Number, required: true, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },
  details: {
    type: String,
    default: ""
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("Billing", billingSchema);
