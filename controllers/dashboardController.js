const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Billing = require("../models/Billing");
const Staff = require("../models/Staff");

const getPatientCount = async (req, res) => {
  const count = await Patient.countDocuments();
  res.json({ count });
};

const getDoctorCount = async (req, res) => {
  const count = await Doctor.countDocuments();
  res.json({ count });
};

const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await Appointment.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patientId", "name")
      .populate("doctorId", "name department")
      .sort({ date: -1 })
      .limit(5);

    const count = await Appointment.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const recent = appointments.map(a => ({
      patientName: a.patientId?.name || "Unknown",
      doctorName: a.doctorId?.name || "Unknown",
      department: a.doctorId?.department || "Unknown",
      date: a.date,
    }));

    return res.status(200).json({ count, recent });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const getMonthlyRevenue = async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const bills = await Billing.find({
    createdAt: { $gte: start, $lte: end },
    paymentStatus: "Paid",
  });

  const amount = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  res.json({ amount });
};

const getOnDutyStaff = async (req, res) => {
  // Optionally, you could filter by shift/today/active etc.
  const staff = await Staff.find({ onDuty: true }).select("name role");
  res.json(staff);
};

module.exports = {
  getPatientCount,
  getDoctorCount,
  getTodayAppointments,
  getMonthlyRevenue,
  getOnDutyStaff,
};
