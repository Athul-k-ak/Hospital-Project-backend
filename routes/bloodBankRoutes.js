const express = require("express");
const { registerBlood, getBloodStock, checkBloodAvailability, getAllBloodAvailability } = require("../controllers/bloodBankController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Only Admin and Reception can access these routes
router.post("/register", protect, authorizeRoles("admin", "reception"), registerBlood);
router.get("/", protect, authorizeRoles("admin", "reception"), getBloodStock);
router.get("/availability/:bloodGroup", protect, authorizeRoles("admin", "reception"), checkBloodAvailability);
router.get("/all", protect, authorizeRoles("admin", "reception"), getAllBloodAvailability);

module.exports = router;
