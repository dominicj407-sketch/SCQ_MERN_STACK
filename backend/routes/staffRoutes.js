const { verifyPatient, insertPatient, reorderQueue, pauseQueue, resumeQueue, getAssignedQueues, verifyAndAdmitPatient, skipCurrentWaiting, getNoShowStatus, emergencyOverride } = require("../controllers/queueController");
const { updateStaff, getStaffById, getStaffs } = require("../controllers/staffController");
const { auth, authorize } = require("../middlewares/auth");
const route = require("express").Router();


route.get("/getStaffById/:staffId", auth, authorize("Staff", "Admin"), getStaffById);
route.get("/staffs", auth, authorize("Admin"), getStaffs);
route.post("/updateStaff/:sid", auth, authorize("Staff", "Admin"), updateStaff);
route.post("/verifyPatient", auth, authorize("Staff"), verifyPatient);
route.post("/verifyAndAdmit", auth, authorize("Staff"), verifyAndAdmitPatient);
route.post("/emergencyOverride", auth, authorize("Staff"), emergencyOverride);
route.post("/skipCurrentWaiting", auth, authorize("Staff"), skipCurrentWaiting);
route.get("/noShowStatus/:queueId", auth, authorize("Staff"), getNoShowStatus);
route.post("/insertPatient/:queueId", auth, authorize("Staff", "Admin"), insertPatient);
route.post("/reorderQueue/:queueId", auth, authorize("Staff", "Admin"), reorderQueue);
route.get("/pauseQueue/:queueId", auth, authorize("Staff"), pauseQueue);
route.get("/resumeQueue/:queueId", auth, authorize("Staff"), resumeQueue);
route.get("/getAssignedQueues/:staffId", auth, authorize("Staff"), getAssignedQueues);

module.exports = route;