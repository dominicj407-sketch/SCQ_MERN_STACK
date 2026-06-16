const { getDoctors, getDoctorById, addNotes, markAsComplete, createQueue, getStatusAndCapacity, updateDoctorStatus, setCapacity, getDoctorsByDept, cancelQueue, updateDoctorProfile, getDoctorQueueDetails } = require("../controllers/doctorController");
const { viewCurrentPatientBydoctorId, markCompleteAndAdvance, pauseQueue, resumeQueue, emergencyOverride } = require("../controllers/queueController");
const { getPatientHistory, getAppointment } = require("../controllers/patientController");
const { auth, authorize } = require('../middlewares/auth');
const route = require("express").Router();


route.get("/doctors", getDoctors);
route.get("/me", auth, authorize("Doctor"), getDoctorById);
route.put("/me", auth, authorize("Doctor"), updateDoctorProfile);
route.get("/queue/details", auth, authorize("Doctor"), getDoctorQueueDetails);
route.get("/getStatusCapacity/:doctorId", getStatusAndCapacity);
route.get("/getDoctors/Dept/:deptId", getDoctorsByDept);
route.get("/getCurrentPatient/:doctorId", auth, authorize("Doctor", "Staff"), viewCurrentPatientBydoctorId);


route.post("/addNotes/:appointmentId", auth, authorize("Doctor"), addNotes);
route.post("/markAsComplete", auth, authorize("Doctor"), markAsComplete);
route.post("/markCompleteAndAdvance", auth, authorize("Doctor"), markCompleteAndAdvance);
route.post("/createQueue", auth, authorize("Doctor"), createQueue);
route.post("/cancelQueue", auth, authorize("Doctor"), cancelQueue);
route.post("/emergencyOverride", auth, authorize("Doctor", "Staff"), emergencyOverride);


route.put("/updateStatus/:doctorId", auth, authorize("Doctor"), updateDoctorStatus);
route.put("/setCapacity", auth, authorize("Doctor"), setCapacity);


route.get("/pauseQueue/:queueId", auth, authorize("Doctor", "Staff"), pauseQueue);
route.get("/resumeQueue/:queueId", auth, authorize("Doctor", "Staff"), resumeQueue);


route.get("/patientHistory/:patientId", auth, authorize("Doctor", "Staff"), getPatientHistory);
route.get("/appointmentDetail/:appointmentId", auth, authorize("Doctor", "Staff"), getAppointment);


route.get("/:doctorId", auth, authorize("Doctor"), getDoctorById);

module.exports = route;