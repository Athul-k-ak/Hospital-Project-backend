const Billing = require("../models/Billing");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

const createBilling = async (req, res) => {
  try {
    const { patientId, appointmentId, amount, paymentStatus, details } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    if (typeof amount !== "number" || amount < 0) {
      return res.status(400).json({ message: "Amount must be a non-negative number" });
    }

    if (appointmentId && !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointmentId" });
    }

    const billing = await Billing.create({
      patientId,
      patientName: patient.name,
      appointmentId: appointmentId || null,
      amount,
      paymentStatus: paymentStatus || "pending",
      details
    });

    res.status(201).json({ message: "Billing created", billing });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBillings = async (req, res) => {
  try {
    const billings = await Billing.find()
      .populate("patientId", "name")
      .populate("appointmentId", "date time");
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBillingByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    const billings = await Billing.find({ patientId })
      .populate("patientId", "name")
      .populate("appointmentId", "date time");

    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBillingById = async (req, res) => {
  try {
    const { billingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(billingId)) {
      return res.status(400).json({ message: "Invalid billingId" });
    }

    const billing = await Billing.findById(billingId)
      .populate("patientId", "name")
      .populate("appointmentId", "date time");

    if (!billing) {
      return res.status(404).json({ message: "Billing record not found" });
    }

    res.json(billing);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createBilling,
  getBillings,
  getBillingByPatient,
  getBillingById
};
