const mongoose = require("mongoose");
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}
const queueSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true
  },

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },

  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },

  date: {
    type: String,
    required: true,
    default: getTodayString
  },

  status: {
    type: String,
    enum: ["OPEN", "CLOSED", "PAUSED"],
    default: "OPEN"
  },

  waiting: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    }
  ],

  skipped: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    }
  ],

  currentPatient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment"
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  closedAt: {
    type: Date,
    default: null
  },
  maxCapacity: {
    type: Number,
    default: 0
  },
  bookedAppointments: {
    type: Number,
    default: 0
  },
  offlineCount: {
    type: Number,
    default: 0
  },
  waitingSince: {
    type: Date,
    default: null
  }
});


queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });
queueSchema.index({ departmentId: 1, date: 1 });

module.exports = mongoose.model("Queue", queueSchema);