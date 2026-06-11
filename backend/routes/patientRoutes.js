const exp = require("../controllers/patientController.js");
const { makePayment, createOrder, getPayment, verifyPayment } = require("../controllers/paymentController.js");
const { viewCurrentPatientByqueueId, viewCurrentPatientBydoctorId, getQueueIdbyDid, getQueueStatus, verifyPatient, getLiveDisplayData } = require("../controllers/queueController.js");
const { getDepts } = require("../controllers/deptController");
const { auth } = require("../middlewares/auth.js");
const route = require('express').Router();

// ── Public routes (no auth needed) ──────────────────────────────────────
route.post("/registerPatient", exp.registerPatient);
route.get("/getLiveQueue/:doctorId", exp.getLiveQueue);
route.get("/getQueuesByDId/:did", getQueueIdbyDid);
route.get("/getDept", getDepts);
route.get("/live-display", getLiveDisplayData);

// ── Auth-protected routes ───────────────────────────────────────────────
route.get("/getPatients", auth, exp.getPatients);
route.get("/getPatientById/:id", auth, exp.getPatientById);
route.post("/updatePatients/:id", auth, exp.updatePatient);
route.delete("/deletePatients/:id", auth, exp.deletePatient);
route.post("/bookAppointment", auth, exp.bookAppointment);
route.post("/validateBooking", auth, exp.validateBooking);
route.post("/removeAppointment/:appId", auth, exp.removeAppointment);
route.get("/getPosition/:appId", auth, exp.getPosition);
route.get("/getQr/:appId", auth, exp.getQrCode);
route.post("/addRecord", auth, exp.addRecord);
route.get("/getReportsToday/:pId", auth, exp.getTodayReports);
route.get("/getReports/:pId", auth, exp.getReports);
route.get("/getBookings/:pId", auth, exp.getBookings);
route.post("/payment", auth, makePayment);
route.post("/create-order", auth, createOrder);
route.post("/verify-payment", auth, verifyPayment);
route.get("/getPatientHistory/:patientId", auth, exp.getPatientHistory);
route.get("/rejoin/Queue/:appointmentId", auth, exp.rejoinQueue);
route.get("/nextPatient/:queueId", auth, exp.nextPatient);
route.get("/skipAppointment/:appointmentId", auth, exp.skipAppointment);
route.post("/requestSkipPermission", auth, exp.requestSkipPermission);
route.get("/getAppointments", auth, exp.getAppointmentsByPatient);
route.get("/getAppointment/:appointmentId", auth, exp.getAppointment);
route.get("/getAppointmentQr/:appointmentId", auth, exp.getAppointmentQR);
route.get("/getQueueStatus/:queueId", auth, getQueueStatus);
route.get("/verifyPatient", auth, verifyPatient);
route.get("/getpaymentById/:paymentId", auth, getPayment);
route.get("/viewCurrentPatient/QueueId/:queueId", auth, viewCurrentPatientByqueueId);
route.get("/viewCurrentPatient/DoctorId/:doctorId", auth, viewCurrentPatientBydoctorId);

module.exports = route;