const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

// Helper: Convert time string (e.g., "10:00 AM") into minutes since midnight
const parseTime = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper: Convert minutes since midnight back to time string
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${formattedHours}:${mins.toString().padStart(2, "0")} ${period}`;
};

// 📌 Book Appointment (Auto-assigns 10-minute slots)
const bookAppointment = async (req, res) => {
  try {
    const { patientId, patient, doctorId, date } = req.body;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    // ✅ Validate Date: Allow only today or future dates
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remove time from today’s date

    if (appointmentDate < today) {
      return res.status(400).json({ message: "Cannot book an appointment for a past date. Please select today or a future date." });
    }

    let finalPatientId;
    let finalPatientName;

    if (patientId) {
      const existingPatient = await Patient.findById(patientId);
      if (!existingPatient) {
        return res.status(400).json({ message: "Patient not found" });
      }
      finalPatientId = patientId;
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

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found" });
    }

    const appointmentDay = appointmentDate.toLocaleDateString("en-US", { weekday: "long" });

    if (!doctor.availableDays.includes(appointmentDay)) {
      return res.status(400).json({ 
        message: `Doctor is not available on ${appointmentDay}. Available days: ${doctor.availableDays.join(", ")}` 
      });
    }

    if (!doctor.availableTime || !Array.isArray(doctor.availableTime) || doctor.availableTime.length === 0) {
      return res.status(400).json({ message: "Doctor available time not specified" });
    }

    // Fetch all appointments for the given date
    const existingAppointments = await Appointment.find({ doctorId, date }).sort({ time: 1 });

    let availableSlot = null;

    // Loop through doctor's available slots
    for (const slot of doctor.availableTime) {
      const [startTimeStr, endTimeStr] = slot.split(" - ");
      let startTime = parseTime(startTimeStr);
      const endTime = parseTime(endTimeStr);

      while (startTime + 10 <= endTime) {
        const formattedTime = formatTime(startTime);

        // Check if this slot is already booked
        const isBooked = existingAppointments.some((appt) => appt.time === formattedTime);

        if (!isBooked) {
          availableSlot = formattedTime;
          break;
        }

        startTime += 10; // Move to the next 10-minute slot
      }

      if (availableSlot) break;
    }

    if (!availableSlot) {
      return res.status(400).json({ message: "Appointments finished for the day." });
    }

    const appointment = await Appointment.create({
      patientId: finalPatientId,
      patientName: finalPatientName,
      doctorId,
      date,
      time: availableSlot,
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
