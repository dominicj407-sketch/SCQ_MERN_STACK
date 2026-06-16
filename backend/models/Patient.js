const mongoose = require("mongoose");
const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, "Enter a valid phone number"]
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  age: {
    type: Number,
    required: true,
    min: 0
  },

  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true
  },

  role: {
    type: String,
    default: "patient"
  },
  masterPassword: {
    type: String
  },

  reports: [
    {
      fileUrl: String,

      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});


patientSchema.pre(/^find/, function () {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});


patientSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.isDeleted) {
    const Appointment = mongoose.model("Appointment");
    const activeAppointments = await Appointment.find({
      patientId: doc._id,
      status: { $in: ["BOOKED", "WAITING", "SKIPPED"] }
    });
    for (const app of activeAppointments) {
      app.status = "CANCELLED";
      await app.save();
    }
  }
});

module.exports = mongoose.model("Patient", patientSchema);