const PatientReport = require("../models/PatientReport");
const Patient = require("../models/Patient");
const BloodBank = require("../models/BloodBank");
const mongoose = require("mongoose");

// Helper function to deduct blood units from the BloodBank for a given blood group.
const deductBloodUnits = async (bloodGroup, unitsNeeded) => {
  let remaining = unitsNeeded;
  // Find all blood donation entries for the blood group, sorted by createdAt (oldest first).
  const donations = await BloodBank.find({ bloodGroup }).sort({ createdAt: 1 });
  for (let donation of donations) {
    if (donation.quantity >= remaining) {
      donation.quantity -= remaining;
      await donation.save();
      remaining = 0;
      break;
    } else {
      remaining -= donation.quantity;
      donation.quantity = 0;
      await donation.save();
    }
  }
  // If remaining > 0, there wasn’t enough blood available.
  return remaining === 0;
};

// Add a patient report. Only doctors can add reports.
const addPatientReport = async (req, res) => {
  try {
    // Only a doctor should be allowed.
    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { patientId, report, prescription, bloodUsed } = req.body;

    // Validate patientId.
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    // Verify that the patient exists.
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(400).json({ message: "Patient not found" });
    }

    // Create a new patient report using the logged-in doctor's ID.
    const newReport = await PatientReport.create({
      patientId,
      doctorId: req.user.id,
      report,
      prescription,
      bloodUsed: bloodUsed ? bloodUsed : null
    });

    // If bloodUsed is provided, deduct the units from the blood bank.
    if (bloodUsed && bloodUsed.bloodGroup && bloodUsed.units) {
      const deducted = await deductBloodUnits(bloodUsed.bloodGroup, bloodUsed.units);
      if (!deducted) {
        return res.status(400).json({ message: "Not enough blood available for the specified blood group" });
      }
    }

    res.status(201).json({
      message: "Patient report added successfully",
      report: newReport
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all reports for a given patient.
const getPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    // Retrieve all reports for the given patient and sort by most recent.
    const reports = await PatientReport.find({ patientId })
      .populate("doctorId", "name")
      .sort({ createdAt: -1 });
      
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Update a patient report. Only the doctor who created the report can modify it.
const updatePatientReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { report, prescription, bloodUsed } = req.body;

    // Find the report.
    const existingReport = await PatientReport.findById(reportId);
    if (!existingReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Ensure the logged-in doctor is the creator of the report.
    if (existingReport.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to modify this report" });
    }

    // Update the report fields if provided.
    if (report !== undefined) existingReport.report = report;
    if (prescription !== undefined) existingReport.prescription = prescription;
    if (bloodUsed !== undefined) {
      existingReport.bloodUsed = bloodUsed;
      // Optionally, adjust blood bank records here if needed.
    }

    await existingReport.save();
    res.json({ message: "Report updated successfully", report: existingReport });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { addPatientReport, getPatientReports, updatePatientReport };
