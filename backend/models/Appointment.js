const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },

  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },

  queueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Queue"
  },

  status: {
    type: String,
    enum: ["BOOKED", "WAITING", "IN_ROOM", "COMPLETED", "SKIPPED", "CANCELLED"],
    default: "BOOKED"
  },

  tokenNumber: Number,

  expectedTime: Date,

  qrCode: String,

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment"
  },

  bookedAt: {
    type: Date,
    default: Date.now
  },
  isOffline: {
    type: Boolean,
    default: false
  },
  prescriptionText: String,
  prescriptionUrl: String,
  startedAt: Date,
  notes:{
    type:String
  },
  reports: [{
    fileName: String,
    fileData: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  completedAt: Date
});

module.exports = mongoose.model("Appointment", appointmentSchema);