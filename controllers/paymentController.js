const Razorpay = require("razorpay");
const crypto = require("crypto");
const Billing = require("../models/Billing");
const mongoose = require("mongoose");

// Create a Razorpay instance with credentials from environment variables.
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order for the given billing record.
const createOrder = async (req, res) => {
  try {
    const { billingId } = req.body;
    if (!billingId || !mongoose.Types.ObjectId.isValid(billingId)) {
      return res.status(400).json({ message: "Invalid billingId" });
    }
    const billing = await Billing.findById(billingId);
    if (!billing) {
      return res.status(404).json({ message: "Billing record not found" });
    }
    // Razorpay expects the amount in paise.
    const options = {
      amount: billing.amount * 100,
      currency: "INR",
      receipt: `receipt_${billingId}`,
      payment_capture: 1, // Auto capture the payment.
    };
    const order = await razorpayInstance.orders.create(options);
    res.json({ order, billingId });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Verify payment using Razorpay's signature.
const verifyPayment = async (req, res) => {
  try {
    const { billingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!billingId || !mongoose.Types.ObjectId.isValid(billingId)) {
      return res.status(400).json({ message: "Invalid billingId" });
    }
    const billing = await Billing.findById(billingId);
    if (!billing) {
      return res.status(404).json({ message: "Billing record not found" });
    }
    // Generate the expected signature.
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      billing.paymentStatus = "paid";
      billing.paymentTransactionId = razorpay_payment_id;
      await billing.save();
      res.json({ message: "Payment verified and billing updated", billing });
    } else {
      res.status(400).json({ message: "Invalid payment signature" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { createOrder, verifyPayment };
