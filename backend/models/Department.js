const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true
  },

  name: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Department", departmentSchema);