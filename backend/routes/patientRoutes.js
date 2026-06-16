const exp = require("../controllers/patientController.js");
const { makePayment, createOrder, getPayment, verifyPayment } = require("../controllers/paymentController.js");
const { viewCurrentPatientByqueueId, viewCurrentPatientBydoctorId, getQueueIdbyDid, getQueueStatus, verifyPatient, getLiveDisplayData } = require("../controllers/queueController.js");
const { getDepts } = require("../controllers/deptController");
const { auth, authorize } = require("../middlewares/auth.js");
const route = require('express').Router();


route.post("/registerPatient", exp.registerPatient);
route.get("/getLiveQueue/:doctorId", exp.getLiveQueue);
route.get("/getQueuesByDId/:did", getQueueIdbyDid);
route.get("/getDept", getDepts);
route.get("/live-display", getLiveDisplayData);


route.get("/getPatients", auth, authorize("Admin", "Staff"), exp.getPatients);
route.get("/getPatientById/:id", auth, authorize("Patient", "Admin", "Staff", "Doctor"), exp.getPatientById);
route.post("/updatePatients/:id", auth, authorize("Patient", "Admin"), exp.updatePatient);
route.delete("/deletePatients/:id", auth, authorize("Patient", "Admin"), exp.deletePatient);
route.post("/bookAppointment", auth, authorize("Patient", "Staff", "Admin"), exp.bookAppointment);
route.post("/validateBooking", auth, authorize("Patient", "Staff", "Admin"), exp.validateBooking);
route.post("/removeAppointment/:appId", auth, authorize("Patient", "Admin", "Staff", "Doctor"), exp.removeAppointment);
route.get("/getPosition/:appId", auth, authorize("Patient", "Admin", "Staff", "Doctor"), exp.getPosition);
route.get("/getQr/:appId", auth, authorize("Patient", "Admin", "Staff", "Doctor"), exp.getQrCode);
route.post("/addRecord", auth, authorize("Patient", "Admin"), exp.addRecord);
route.get("/getReportsToday/:pId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getTodayReports);
route.get("/getReports/:pId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getReports);
route.get("/getBookings/:pId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getBookings);
route.post("/payment", auth, authorize("Patient", "Staff", "Admin"), makePayment);
route.post("/create-order", auth, authorize("Patient", "Staff", "Admin"), createOrder);
route.post("/verify-payment", auth, authorize("Patient", "Staff", "Admin"), verifyPayment);
route.get("/getPatientHistory/:patientId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getPatientHistory);
route.get("/rejoin/Queue/:appointmentId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.rejoinQueue);
route.get("/nextPatient/:queueId", auth, authorize("Doctor", "Staff", "Admin"), exp.nextPatient);
route.get("/skipAppointment/:appointmentId", auth, authorize("Doctor", "Staff", "Admin"), exp.skipAppointment);
route.post("/requestSkipPermission", auth, authorize("Doctor", "Staff", "Admin"), exp.requestSkipPermission);
route.get("/getAppointments", auth, authorize("Patient", "Admin"), exp.getAppointmentsByPatient);
route.get("/getAppointment/:appointmentId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getAppointment);
route.get("/getAppointmentQr/:appointmentId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), exp.getAppointmentQR);
route.get("/getQueueStatus/:queueId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), getQueueStatus);
route.get("/verifyPatient", auth, authorize("Doctor", "Staff", "Admin"), verifyPatient);
route.get("/getpaymentById/:paymentId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), getPayment);
route.get("/viewCurrentPatient/QueueId/:queueId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), viewCurrentPatientByqueueId);
route.get("/viewCurrentPatient/DoctorId/:doctorId", auth, authorize("Patient", "Doctor", "Staff", "Admin"), viewCurrentPatientBydoctorId);

module.exports = route;