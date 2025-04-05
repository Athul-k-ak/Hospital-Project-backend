const express = require("express");
const { createBilling, getBillings, getBillingByPatient } = require("../controllers/billingController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Allow both "admin" and "reception" roles to create billing records.
router.post("/create", protect, authorizeRoles("admin", "reception"), createBilling);

// Allow both "admin" and "reception" roles to view all billing records.
router.get("/", protect, authorizeRoles("admin", "reception"), getBillings);

// Allow both "admin" and "reception" roles to view billing records for a specific patient.
router.get("/patient/:patientId", protect, authorizeRoles("admin", "reception"), getBillingByPatient);

module.exports = router;
