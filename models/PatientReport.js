const mongoose = require("mongoose");

const patientReportSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Patient", 
    required: true,
    index: true // ✅ Improves query performance
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Doctor", 
    required: true,
    index: true // ✅ Improves query performance
  },
  report: { 
    type: String, 
    required: true, 
    trim: true // ✅ Removes unnecessary spaces
  },
  prescription: { 
    type: String, 
    trim: true 
  },
  bloodUsed: {
    bloodGroup: { 
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], // ✅ Ensures valid blood groups
      default: null 
    },
    units: { 
      type: Number, 
      min: 1, // ✅ Ensures at least 1 unit is used
      default: null 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("PatientReport", patientReportSchema);
