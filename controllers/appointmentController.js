const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

// Convert time string to minutes since midnight
const parseTime = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Convert minutes back to time string
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${formattedHours}:${mins.toString().padStart(2, "0")} ${period}`;
};

// Get day of week from date string
const getDayName = (dateString) => {
  const date = new Date(dateString + "T00:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
};

// 📌 Book an Appointment
const bookAppointment = async (req, res) => {
  try {
    const { patientId, patient, doctorId, date, time } = req.body;

    // Validate doctorId
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    if (!date) {
      return res.status(400).json({ message: "Appointment date is required" });
    }

    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({ message: "Cannot book an appointment for a past date" });
    }

    let finalPatientId, finalPatientName;

    // Handle Patient - existing or new
    if (patientId) {
      const existingPatient = await Patient.findById(patientId);
      if (!existingPatient) return res.status(400).json({ message: "Patient not found" });

      finalPatientId = existingPatient._id;
      finalPatientName = existingPatient.name;
    } else if (patient) {
      const { name, age, gender, phone } = patient;
      if (!name || !age || !gender || !phone) {
        return res.status(400).json({ message: "Incomplete patient details" });
      }

      const newPatient = await Patient.create({ name, age, gender, phone });
      finalPatientId = newPatient._id;
      finalPatientName = newPatient.name;
    } else {
      return res.status(400).json({ message: "Patient details are required" });
    }

    // Fetch doctor and check availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(400).json({ message: "Doctor not found" });

    const appointmentDay = getDayName(date);
    if (!doctor.availableDays.includes(appointmentDay)) {
      return res.status(400).json({
        message: `Doctor not available on ${appointmentDay}. Available days: ${doctor.availableDays.join(", ")}`,
      });
    }

    if (!Array.isArray(doctor.availableTime) || doctor.availableTime.length === 0) {
      return res.status(400).json({ message: "Doctor's available time is not set" });
    }

    // Get taken time slots for the doctor on the selected date
    const existingAppointments = await Appointment.find({ doctorId, date });
    const takenTimes = existingAppointments.map((appt) => appt.time);

    // Time validation helper
    const isTimeInAvailableSlot = (timeStr) => {
      const timeMinutes = parseTime(timeStr);
      return doctor.availableTime.some((slot) => {
        const [startStr, endStr] = slot.split(" - ");
        const start = parseTime(startStr);
        const end = parseTime(endStr);
        return timeMinutes >= start && timeMinutes + 10 <= end;
      });
    };

    let finalTime = null;

    // If user selected a time, validate it
    if (time) {
      if (!isTimeInAvailableSlot(time)) {
        return res.status(400).json({ message: "Selected time is not within doctor's available slots" });
      }

      if (takenTimes.includes(time)) {
        return res.status(400).json({ message: "Selected time is already booked" });
      }

      finalTime = time;
    } else {
      // Auto assign time from available slots
      for (const slot of doctor.availableTime) {
        const [startStr, endStr] = slot.split(" - ");
        let start = parseTime(startStr);
        const end = parseTime(endStr);

        while (start + 10 <= end) {
          const formattedTime = formatTime(start);
          if (!takenTimes.includes(formattedTime)) {
            finalTime = formattedTime;
            break;
          }
          start += 10;
        }

        if (finalTime) break;
      }

      if (!finalTime) {
        return res.status(400).json({ message: "All slots are full for selected date" });
      }
    }

    // Save appointment
    const appointment = await Appointment.create({
      patientId: finalPatientId,
      patientName: finalPatientName,
      doctorId,
      date,
      time: finalTime,
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: {
        _id: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      },
      doctorName: doctor.name,
    });
  } catch (error) {
    console.error("Book Appointment Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Get All Appointments (Grouped)
const getAppointments = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (!["admin", "reception", "doctor"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = {};

    // If the user is a doctor, filter only their appointments
    if (req.user.role === "doctor") {
      query.doctorId = req.user._id;
    }

    const appointments = await Appointment.find(query)
      .populate("doctorId", "name specialization")
      .populate("patientId", "name age gender phone")
      .sort({ date: 1, time: 1 });

    const formattedAppointments = appointments.map((appt) => ({
      _id: appt._id,
      date: appt.date,
      time: appt.time,
      status: appt.status || "Booked",
      doctor: {
        _id: appt.doctorId?._id,
        name: appt.doctorId?.name,
        specialization: appt.doctorId?.specialization,
      },
      patient: {
        _id: appt.patientId?._id,
        name: appt.patientId?.name,
        age: appt.patientId?.age,
        gender: appt.patientId?.gender,
        phone: appt.patientId?.phone,
      },
    }));

    res.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error("Error in getAppointments:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Get Appointments by Doctor
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const appointmentsByDoctor = await Appointment.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor"
        }
      },
      { $unwind: "$doctor" },
      {
        $lookup: {
          from: "patients",  // Assuming the patient collection is named "patients"
          localField: "patientId",
          foreignField: "_id",
          as: "patient"
        }
      },
      { $unwind: "$patient" }, // Unwind the patient data to get the name
      {
        $group: {
          _id: "$doctor._id",
          doctorName: { $first: "$doctor.name" },
          appointments: {
            $push: {
              _id: "$_id",
              patientName: "$patient.name",  // Add patient's name here
              date: "$date",
              time: "$time"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          doctorName: 1,
          appointments: 1
        }
      }
    ]);

    // Log the response for debugging purposes
    console.log("Appointments by Doctor:", appointmentsByDoctor);

    res.json(appointmentsByDoctor);
  } catch (error) {
    console.error("Error in getAppointmentsByDoctor:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};



module.exports = {
  bookAppointment,
  getAppointments,
  getAppointmentsByDoctor,
};
