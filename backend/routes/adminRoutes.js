const { CreateDept, getDepts } = require("../controllers/deptController");
const { addDoctor, updateDoctor, deleteDoctor, getDoctors, getDoctorById } = require("../controllers/doctorController");
const { deleteStaff, updateStaff, addStaff, assignStaffToDoctor, getAssignments, getStaffs } = require("../controllers/staffController");
const { getAnalytics } = require("../controllers/adminController");
const { auth, authorize } = require("../middlewares/auth");
const Route = require("express").Router();


Route.use(auth, authorize("Admin"));

Route.post("/addDept", CreateDept);
Route.get("/getDept", getDepts);
Route.post("/addDoctor", addDoctor);
Route.post("/updateDoctor/:did", updateDoctor);
Route.delete("/deleteDoctor/:did", deleteDoctor);
Route.get("/getDoctors", getDoctors);
Route.get("/getDoctorById/:id", getDoctorById);
Route.post("/addStaff", addStaff);
Route.post("/updateStaff/:sid", updateStaff);
Route.delete("/deleteStaff/:sid", deleteStaff);
Route.get("/getStaffs", getStaffs);
Route.post("/assignStaffToDoctor", assignStaffToDoctor);
Route.get("/getAssignments", getAssignments);
Route.get("/analytics", getAnalytics);

module.exports = Route;