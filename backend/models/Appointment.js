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


appointmentSchema.index({ patientId: 1, bookedAt: -1 });
appointmentSchema.index({ doctorId: 1, status: 1, bookedAt: 1 });
appointmentSchema.index({ departmentId: 1, bookedAt: 1 });
appointmentSchema.index({ queueId: 1 });


appointmentSchema.post("save", async function (doc) {
  if (doc.status === "CANCELLED" && doc.queueId) {
    const Queue = mongoose.model("Queue");
    const updateResult = await Queue.updateOne(
      { _id: doc.queueId, $or: [{ waiting: doc._id }, { skipped: doc._id }] },
      { 
        $pull: { waiting: doc._id, skipped: doc._id },
        $inc: { bookedAppointments: -1 }
      }
    );
    if (updateResult.modifiedCount > 0) {
      const { updateQueueExpectedTimes } = require("../controllers/queueController");
      await updateQueueExpectedTimes(doc.queueId);
    }
  }
});

module.exports = mongoose.model("Appointment", appointmentSchema);