require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const receptionRoutes = require("./routes/receptionRoutes");
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const bloodBankRoutes = require("./routes/bloodBankRoutes");
const patientReportRoutes = require("./routes/patientReportRoutes");
const billingRoutes = require("./routes/billingRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); 
const staffRoutes = require("./routes/staffRoutes");


connectDB();


const app = express();
app.use(cors({
  origin: "http://localhost:5173",  // Allow frontend URL
  credentials: true,  // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/bloodbank", bloodBankRoutes);
app.use("/api/patientreport", patientReportRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/auth", authRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
