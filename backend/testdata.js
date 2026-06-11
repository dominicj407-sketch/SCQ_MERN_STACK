const mongoose = require("mongoose");
require('dotenv').config();

const Patient = require("./models/Patient");
const Doctor = require("./models/Doctor");
const Department = require("./models/Department");
const Hospital = require("./models/Hospital");
const Queue = require("./models/Queue");
const Appointment = require("./models/Appointment");
const Payment = require("./models/Payment");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/scq");

async function insertTestData() {

  try {
    const queue = await Queue.create({
      hospitalId: "69ac0b297e10d8b3c67932d0",
      departmentId: "69ac0b297e10d8b3c67932d4",
      doctorId: "69ac0b297e10d8b3c67932d7",
      date: new Date(),
      waiting: []
    });

    console.log("Queue created:", queue._id);
  } catch (err) {
    console.error(err);
  }

}

insertTestData();