const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  id:
  {
    type:String,
    required:true
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
  role: {
    type: String,
    default: "doctor"
  },

  status: {
    type: String,
    enum: ["available", "emergency", "offline", "break", "inroom"],
    default: "offline"
  },

  dailyCapacity: {
    type: Number,
    validate:{
      validator: function(v){
        if(v>10&&v<50){
          return true;
        }
        else{
          return false;
        }
      },
      message:"capacity violation"
    }
  },

  schedule: [
    {
      date: Date,
      slots: Number
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model("Doctor", doctorSchema);