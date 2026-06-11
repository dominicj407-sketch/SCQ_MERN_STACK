const mongoose = require('mongoose');
const Queue = require('./models/Queue');
const Appointment = require('./models/Appointment');
const StaffAssignment = require('./models/StaffAssignment');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/local').then(async () => {
    const queue = await Queue.findOne().sort({ createdAt: -1 });
    console.log("Latest Queue:");
    console.dir(queue.toObject(), {depth: null});
    
    process.exit(0);
}).catch(err => {
    console.log(err);
    process.exit(1);
});
