const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },

  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
  },

  amount: Number,

  method: {
    type: String,
    enum: ["CASH", "CARD", "UPI", "ONLINE", "RAZORPAY"]
  },

  status: {
    type: String,
    enum: ["PAID", "REFUNDED", "FAILED"],
    default: "PAID"
  },

  refundDate: Date,

  razorpayPaymentId: String,
  razorpayOrderId: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});


paymentSchema.index({ createdAt: 1, status: 1 });
paymentSchema.index({ appointmentId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);