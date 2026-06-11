const { getDoctors, getDoctorById, addNotes, markAsComplete, createQueue, getStatusAndCapacity, updateDoctorStatus, setCapacity, getDoctorsByDept, cancelQueue } = require("../controllers/doctorController");
const { viewCurrentPatientBydoctorId, markCompleteAndAdvance, pauseQueue, resumeQueue } = require("../controllers/queueController");
const { getPatientHistory, getAppointment } = require("../controllers/patientController");
const { auth } = require('../middlewares/auth');
const route = require("express").Router();

// ── GET routes (specific routes BEFORE the catch-all /:doctorId) ────────
route.get("/doctors", getDoctors);
route.get("/me", auth, getDoctorById);
route.get("/getStatusCapacity/:doctorId", getStatusAndCapacity);
route.get("/getDoctors/Dept/:deptId", getDoctorsByDept);
route.get("/getCurrentPatient/:doctorId", auth, viewCurrentPatientBydoctorId);

// ── POST routes ─────────────────────────────────────────────────────────
route.post("/addNotes/:appointmentId", addNotes);
route.post("/markAsComplete", auth, markAsComplete);
route.post("/markCompleteAndAdvance", auth, markCompleteAndAdvance);
route.post("/createQueue", auth, createQueue);
route.post("/cancelQueue", auth, cancelQueue);

// ── PUT routes ──────────────────────────────────────────────────────────
route.put("/updateStatus/:doctorId", auth, updateDoctorStatus);
route.put("/setCapacity", auth, setCapacity);

// ── Queue control routes ────────────────────────────────────────────────
route.get("/pauseQueue/:queueId", auth, pauseQueue);
route.get("/resumeQueue/:queueId", auth, resumeQueue);

// ── Patient info routes (for in-room view) ──────────────────────────────
route.get("/patientHistory/:patientId", auth, getPatientHistory);
route.get("/appointmentDetail/:appointmentId", auth, getAppointment);

// ── Catch-all param route (MUST be last among GET routes) ───────────────
route.get("/:doctorId", auth, getDoctorById);

module.exports = route;