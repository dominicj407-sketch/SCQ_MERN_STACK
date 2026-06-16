const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  staffId: {
    type: String,
    unique: true,
    required:true
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
   phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, "Enter a valid phone number"]
  },
  role: {
    type: String,
    default:"staff"
  },
  masterPassword: {
    type: String
  },

  active: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});


staffSchema.pre(/^find/, function () {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});


staffSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.isDeleted) {
    const StaffAssignment = mongoose.model("StaffAssignment");
    await StaffAssignment.updateMany(
      { staffId: doc._id, active: true },
      { active: false }
    );
  }
});

module.exports = mongoose.model("Staff", staffSchema);