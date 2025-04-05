const Billing = require("../models/Billing");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const mongoose = require("mongoose");

const createBilling = async (req, res) => {
  try {
    // Only reception or admin can create billing records.
    if (!req.user || (req.user.role !== "reception" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Access Denied" });
    }
    
    const { patientId, appointmentId, amount, paymentStatus, details } = req.body;
    
    // Validate patientId.
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(400).json({ message: "Patient not found" });
    }
    
    // Validate amount.
    if (amount === undefined || typeof amount !== "number" || amount < 0) {
      return res.status(400).json({ message: "Amount must be a non-negative number" });
    }
    
    // Validate appointmentId if provided.
    if (appointmentId && !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointmentId" });
    }
    
    // Create the billing record including patientName.
    const billing = await Billing.create({
      patientId,
      patientName: patient.name,  // Store patient name for quick reference.
      appointmentId: appointmentId || null,
      amount,
      paymentStatus: paymentStatus || "pending",
      details
    });
    
    res.status(201).json({
      message: "Billing record created successfully",
      billing
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getBillings = async (req, res) => {
  try {
    const billings = await Billing.find({})
      .populate("patientId", "name")
      .populate("appointmentId", "date time");
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getBillingByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }
    const billings = await Billing.find({ patientId })
      .populate("patientId", "name")
      .populate("appointmentId", "date time");
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { createBilling, getBillings, getBillingByPatient };
