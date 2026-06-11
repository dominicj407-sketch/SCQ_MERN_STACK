const Department = require("../models/Department");

async function CreateDept(req, res) {
    try {
        const { hospitalId, name } = req.body;
        const d = await Department.findOne({ name });
        if (d) {
            return res.status(409).json({ already: true });
        }
        const dept = new Department({ hospitalId, name });
        await dept.save();
        res.json({ msg: "Successfully added", dept, already: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getDepts(req, res) {
    try {
        const depts = await Department.find();
        res.json({ departments: depts, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { CreateDept, getDepts };
