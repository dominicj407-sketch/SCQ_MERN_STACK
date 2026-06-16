const mongoose = require("mongoose");
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}
const staffAssignmentSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true
  },

  queueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Queue"
  },

  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },
  permissions: {
    canCallNext: { type: Boolean, default: false },
    canSkip: { type: Boolean, default: false },
    canCancel: { type: Boolean, default: false },
    canReorder: { type: Boolean, default: false },
    canCloseQueue: { type: Boolean, default: false }
  },

  assignedAt: {
    type: String,
    default: getTodayString,
  },

  active: {
    type: Boolean,
    default: true
  }
});


staffAssignmentSchema.index({ staffId: 1, active: 1 });

module.exports = mongoose.model("StaffAssignment", staffAssignmentSchema);