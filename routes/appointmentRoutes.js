const express = require("express");
const { bookAppointment, getAppointments, getAppointmentsByDoctor, getAppointmentsByDoctorId, updateAppointmentStatus } = require("../controllers/appointmentController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

router.post("/book", protect, bookAppointment);


router.get("/by-doctor", protect, getAppointmentsByDoctor);
router.get("/", protect, getAppointments);
router.get("/doctor/:doctorId", protect, getAppointmentsByDoctorId);

router.put("/update-status/:appointmentId", protect, updateAppointmentStatus);

module.exports = router;
