const express = require("express");
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Allow both admin and reception roles to create an order and verify payment.
router.post("/order", protect, authorizeRoles("admin", "reception"), createOrder);
router.post("/verify", protect, authorizeRoles("admin", "reception"), verifyPayment);

module.exports = router;
