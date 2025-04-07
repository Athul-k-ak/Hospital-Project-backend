const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

// Convert time string (e.g., "10:00 AM") to minutes since midnight
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

const getDayName = (dateString) => {
  const date = new Date(dateString + "T00:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
};

// 📌 Book Appointment
const bookAppointment = async (req, res) => {
  try {
    const { patientId, patient, doctorId, date, time } = req.body;

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

    // Find or Create Patient
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

    // Fetch Doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(400).json({ message: "Doctor not found" });

    const appointmentDay = getDayName(date); // Proper weekday extraction

    if (!doctor.availableDays.includes(appointmentDay)) {
      return res.status(400).json({
        message: `Doctor not available on ${appointmentDay}. Available days: ${doctor.availableDays.join(", ")}`,
      });
    }

    if (!Array.isArray(doctor.availableTime) || doctor.availableTime.length === 0) {
      return res.status(400).json({ message: "Doctor's available time is not set" });
    }

    const existingAppointments = await Appointment.find({ doctorId, date });
    const takenTimes = existingAppointments.map((appt) => appt.time);

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

    // Check if a time is provided
    if (time) {
      if (!isTimeInAvailableSlot(time)) {
        return res.status(400).json({ message: "Selected time is not within doctor's available slots" });
      }
      if (takenTimes.includes(time)) {
        return res.status(400).json({ message: "Selected time is already booked" });
      }
      finalTime = time;
    } else {
      // Auto-assign next available 10-min slot
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
        return res.status(400).json({ message: "Appointments full for selected day" });
      }
    }

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


const getAppointments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    if (!["admin", "reception", "doctor"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

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
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient"
        }
      },
      { $unwind: "$patient" },
      {
        $group: {
          _id: { doctor: "$doctor._id", date: "$date" },
          doctorName: { $first: "$doctor.name" },
          totalAppointments: { $sum: 1 },
          date: { $first: "$date" },
          slots: {
            $push: {
              time: "$time",
              patient: {
                id: "$patient._id",
                name: "$patient.name",
                age: "$patient.age",
                gender: "$patient.gender",
                phone: "$patient.phone"
              }
            }
          }
        }
      }
    ]);

    // Sort appointments by date, then group by doctor, and sort slots by time
    const sortedAppointments = appointmentsByDoctor
      .sort((a, b) => new Date(a.date) - new Date(b.date)) // Sort by date
      .map((entry) => ({
        doctorId: entry._id.doctor,
        doctorName: entry.doctorName,
        totalAppointments: entry.totalAppointments,
        date: new Date(entry.date).toISOString().split("T")[0], // YYYY-MM-DD
        slots: entry.slots.sort((a, b) => {
          const timeA = new Date(`1970-01-01 ${a.time}`);
          const timeB = new Date(`1970-01-01 ${b.time}`);
          return timeA - timeB;
        })
      }));

    res.json({ appointments: sortedAppointments });
  } catch (error) {
    console.error("Error in getEnhancedAppointments:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};



// 📌 Fetch Appointments by Doctor
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
        $group: {
          _id: "$doctor._id",
          doctorName: { $first: "$doctor.name" },
          appointments: { $push: {
            _id: "$_id",
            patientId: "$patientId",
            date: "$date",
            time: "$time"
          }}
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
    res.json(appointmentsByDoctor);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { bookAppointment, getAppointments, getAppointmentsByDoctor };
