const { verifyPatient, insertPatient, reorderQueue, pauseQueue, resumeQueue, getAssignedQueues, verifyAndAdmitPatient, skipCurrentWaiting, getNoShowStatus, emergencyOverride } = require("../controllers/queueController");
const { updateStaff, getStaffById, getStaffs } = require("../controllers/staffController");
const { auth } = require("../middlewares/auth");
const route = require("express").Router();

// All staff routes require authentication
route.get("/getStaffById/:staffId", auth, getStaffById);
route.get("/staffs", auth, getStaffs);
route.post("/updateStaff/:sid", auth, updateStaff);
route.post("/verifyPatient", auth, verifyPatient);
route.post("/verifyAndAdmit", auth, verifyAndAdmitPatient);
route.post("/emergencyOverride", auth, emergencyOverride);
route.post("/skipCurrentWaiting", auth, skipCurrentWaiting);
route.get("/noShowStatus/:queueId", auth, getNoShowStatus);
route.post("/insertPatient/:queueId", auth, insertPatient);
route.post("/reorderQueue/:queueId", auth, reorderQueue);
route.get("/pauseQueue/:queueId", auth, pauseQueue);
route.get("/resumeQueue/:queueId", auth, resumeQueue);
route.get("/getAssignedQueues/:staffId", auth, getAssignedQueues);

module.exports = route;