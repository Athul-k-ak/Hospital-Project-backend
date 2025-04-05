const express = require("express");
const { registerPatient, getPatients } = require("../controllers/patientController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

router.post("/register",protect, registerPatient);
router.get("/", protect, getPatients);

module.exports = router;
