const express = require("express");
const router = express.Router();
const {
  getPatientCount,
  getDoctorCount,
  getTodayAppointments,
  getMonthlyRevenue,
  getOnDutyStaff
} = require("../controllers/dashboardController");

const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// 🛡️ Only Admin can view dashboard stats
router.get("/patients/count", protect, authorizeRoles("admin"), getPatientCount);
router.get("/doctors/count", protect, authorizeRoles("admin"), getDoctorCount);
router.get("/appointments/today", protect, authorizeRoles("admin"), getTodayAppointments);
router.get("/revenue/month", protect, authorizeRoles("admin"), getMonthlyRevenue);
router.get("/staff/onduty", protect, authorizeRoles("admin"), getOnDutyStaff);

module.exports = router;
