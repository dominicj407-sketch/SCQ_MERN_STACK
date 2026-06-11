const mongoose = require("mongoose");

const queueLogSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true
  },

  action: String,

  fromStatus: String,

  toStatus: String,

  doneBy: {
    type: mongoose.Schema.Types.ObjectId
  },

  role: {
    type: String,
    enum: ["STAFF", "DOCTOR", "SYSTEM"]
  },

  timestamp: {
    type: Date,
    default: Date.now
  },

  reason: String
});

module.exports = mongoose.model("QueueLog", queueLogSchema);