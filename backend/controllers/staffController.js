const Staff = require("../models/staff");
const StaffAssignment = require("../models/StaffAssignment");
const Queue = require("../models/Queue");
const bcrypt = require("bcryptjs");

async function addStaff(req, res) {
    try {
        const { name, staffId, phone, email, password, age, gender, hospitalId, departmentId } = req.body;
        const s = await Staff.findOne({ staffId });
        if (s)
            return res.status(409).json({ msg: "Already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const staff = new Staff({ name, staffId, phone, email, password: hashedPassword, age, gender, hospitalId, departmentId });
        await staff.save();
        res.json({ msg: "Registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateStaff(req, res) {
    try {
        const sid = req.params.sid;
        const { name, phone, email, password } = req.body;
        const s = await Staff.findOne({ staffId: sid });
        if (!s)
            return res.status(404).json({ msg: "Not found", found: false });

        const updateData = { name, phone, email };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await Staff.findOneAndUpdate({ staffId: sid }, updateData);
        res.json({ msg: "Updated successfully", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteStaff(req, res) {
    try {
        const staffId = req.params.sid;
        const s = await Staff.findOne({ staffId });
        if (!s)
            return res.status(404).json({ msg: "Not found", found: false });
        await Staff.findOneAndDelete({ staffId });
        res.json({ msg: "Successfully deleted", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getStaffs(req, res) {
    try {
        const staffs = await Staff.find().select("-password");
        res.json({ staffs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getStaffById(req, res) {
    try {
        const id = req.user.id;
        const staff = await Staff.findById(id);
        if (!staff)
            return res.status(404).json({ found: false, msg: "Not found" });
        res.json({ staff, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function assignStaffToDoctor(req, res) {
    try {
        const { staffId, doctorId } = req.body;
        console.log(staffId, doctorId);
        // Find staff by the custom string ID like "SCQ001"
        const staff = await Staff.findOne({ staffId });
        if (!staff)
            return res.status(401).json({ msg: "Staff not found", found: false });

        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today });
        if (!queue)
            return res.status(402).json({ msg: "Queue not found for today", found: false });
        const assignment = new StaffAssignment({
            staffId: staff._id, doctorId, queueId: queue._id
        });
        await assignment.save();
        res.json({ msg: "Staff assigned successfully", assignment, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAssignments(req, res) {
    try {
        const assignments = await StaffAssignment.find()
            .populate('staffId')
            .populate('doctorId')
            .populate('queueId');
        res.json({ assignments, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { addStaff, updateStaff, deleteStaff, getStaffById, getStaffs, assignStaffToDoctor, getAssignments };