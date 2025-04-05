const express = require("express");
const { registerDoctor, loginDoctor, getDoctors, logout, getDoctorById, updateDoctor } = require("../controllers/doctorController");
const protect = require("../middleware/authMiddleware"); // Import middleware
const upload = require("../middleware/uploadMiddleware");


const router = express.Router();

router.post("/signup", upload.single("profileImage"),protect, registerDoctor); // ✅ Ensure protect is applied
router.post("/login", loginDoctor);
router.post("/logout", logout);
router.get("/", protect, getDoctors);
router.get("/:id", protect, getDoctorById);
router.put("/:id", protect, upload.single("profileImage"), updateDoctor);



module.exports = router;
