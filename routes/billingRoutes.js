const express = require("express");
const {
  createBilling,
  getBillings,
  getBillingByPatient,
  getBillingById
} = require("../controllers/billingController");

const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/create", protect, authorizeRoles("admin", "reception"), createBilling);
router.get("/", protect, authorizeRoles("admin", "reception"), getBillings);
router.get("/patient/:patientId", protect, authorizeRoles("admin", "reception"), getBillingByPatient);
router.get("/:billingId", protect, authorizeRoles("admin", "reception"), getBillingById);

module.exports = router;
