const express = require("express");
const { addPatientReport, getPatientReports, updatePatientReport } = require("../controllers/patientReportController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Only a doctor can add or update a report.
router.post("/add", protect, authorizeRoles("doctor"), addPatientReport);
router.put("/:reportId", protect, authorizeRoles("doctor"), updatePatientReport);

// Get all reports for a specific patient.
router.get("/:patientId", protect, getPatientReports);

module.exports = router;
