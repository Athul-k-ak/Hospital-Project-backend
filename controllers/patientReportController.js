const PatientReport = require("../models/PatientReport");
const Patient = require("../models/Patient");
const BloodBank = require("../models/BloodBank");
const mongoose = require("mongoose");

// Helper function to deduct blood units from the BloodBank for a given blood group.
const deductBloodUnits = async (bloodGroup, unitsNeeded) => {
  let remaining = unitsNeeded;
  const updatedDonations = [];

  const donations = await BloodBank.find({ bloodGroup }).sort({ createdAt: 1 });
  for (let donation of donations) {
    if (donation.quantity >= remaining) {
      donation.quantity -= remaining;
      updatedDonations.push(donation);
      remaining = 0;
      break;
    } else {
      remaining -= donation.quantity;
      donation.quantity = 0;
      updatedDonations.push(donation);
    }
  }

  if (remaining === 0) {
    for (const donation of updatedDonations) {
      await donation.save();
    }
    return true;
  }

  return false;
};

// Add a patient report. Only doctors can add reports.
const addPatientReport = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { patientId, report, prescription, bloodUsed } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // If blood is required, check and deduct it before creating the report
    if (bloodUsed && bloodUsed.bloodGroup && bloodUsed.units) {
      const deducted = await deductBloodUnits(bloodUsed.bloodGroup, bloodUsed.units);
      if (!deducted) {
        return res.status(400).json({
          message: "Not enough blood available for the specified blood group",
        });
      }
    }

    const newReport = new PatientReport({
      patientId,
      doctorId: req.user.id,
      report,
      prescription,
      bloodUsed: bloodUsed || null,
    });

    await newReport.save();

    res.status(201).json({
      message: "Patient report added successfully",
      report: newReport,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Inside patientReportController.js

const getPatientsWithReports = async (req, res) => {
  try {
    const patientIds = await PatientReport.distinct("patientId");

    const patients = await Patient.find({ _id: { $in: patientIds } }).select("name");

    res.json({ patients });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// Get all reports for a given patient
const getPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    const reports = await PatientReport.find({ patientId })
      .populate("doctorId", "name")
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Update a patient report (only creator doctor can update)
const updatePatientReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { report, prescription, bloodUsed } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const existingReport = await PatientReport.findById(reportId);
    if (!existingReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (existingReport.doctorId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to modify this report" });
    }

    if (report !== undefined) existingReport.report = report;
    if (prescription !== undefined) existingReport.prescription = prescription;

    if (bloodUsed !== undefined) {
      // Optionally validate or deduct blood again here if increasing quantity
      existingReport.bloodUsed = bloodUsed;
    }

    await existingReport.save();

    res.json({ message: "Report updated successfully", report: existingReport });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  addPatientReport,
  getPatientReports,
  updatePatientReport,
  getPatientsWithReports,
};
