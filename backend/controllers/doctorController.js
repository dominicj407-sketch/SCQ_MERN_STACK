const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Queue = require("../models/Queue");
const Patient = require("../models/Patient");
const Staff = require("../models/staff");
const StaffAssignment = require("../models/StaffAssignment");
const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const { cancelQueueAppointments } = require("./queueController");
const { sendEmail, buildCompletionEmail, buildQueueCancelledEmail, buildMasterPasswordEmail } = require("../utils/emailService");


async function addDoctor(req, res) {
    try {
        const { name, id, phone, email, password, age, gender, hospitalId, departmentId } = req.body;
        const d = await Doctor.findOne({ id });
        if (d)
            return res.status(409).json({ msg: "Already exists", already: true });

        const hashedPassword = await bcrypt.hash(password, 10);

        
        const crypto = require("crypto");
        const masterPasswordText = 'MP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const hashedMasterPassword = await bcrypt.hash(masterPasswordText, 10);

        const doctor = new Doctor({
            name, id, phone, email,
            password: hashedPassword,
            masterPassword: hashedMasterPassword,
            age, gender, hospitalId, departmentId
        });
        await doctor.save();

        
        try {
            const emailHtml = buildMasterPasswordEmail(name, "Doctor", masterPasswordText);
            await sendEmail(email, "🔑 SmartCareQ: Your Recovery Master Password", emailHtml);
        } catch (mailErr) {
            console.error("Failed to send master password email to doctor:", mailErr.message);
        }

        res.json({ msg: "Registered successfully", already: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateDoctor(req, res) {
    try {
        const id = req.params.did;
        const { name, phone, email, password, age, gender } = req.body;
        const d = await Doctor.findOne({ id });
        if (!d)
            return res.status(404).json({ msg: "Not found", found: false });

        const updateData = { name, phone, email, age, gender };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await Doctor.findOneAndUpdate({ id }, updateData);
        res.json({ msg: "Updated successfully", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getDoctors(req, res) {
    try {
        const doctors = await Doctor.find().select("-password");
        res.json({ doctors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getDoctorById(req, res) {
    try {
        const id = req.user.id;
        const d = await Doctor.findOne({ id }).populate("departmentId", "name");
        if (!d)
            return res.status(404).json({ found: false, msg: "Not found" });
        res.json({ d, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteDoctor(req, res) {
    try {
        const id = req.params.did;
        const d = await Doctor.findOne({ id });
        if (!d)
            return res.status(404).json({ msg: "Not found", found: false });
        await Doctor.findOneAndUpdate({ id }, { isDeleted: true }, { new: true });
        res.json({ msg: "Successfully deleted", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getDoctorsByDept(req, res) {
    try {
        const deptId = req.params.deptId;
        const doctors = await Doctor.find({ departmentId: deptId });
        if (!doctors || doctors.length === 0)
            return res.status(404).json({ msg: "No doctors found in this department", found: false });
        res.status(200).json({ count: doctors.length, doctors, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function setCapacity(req, res) {
    try {
        const { doctorId, capacity } = req.body;
        const doctorId1 = new mongoose.Types.ObjectId(doctorId);
        const d = await Doctor.findById(doctorId1);
        if (!d)
            return res.status(404).json({ err: "Doctor not found", found: false });
        d.dailyCapacity = capacity;
        await d.save();
        res.json({ doctorId, msg: "Updated the capacity successfully", found: true });
    } catch (err) {
        if (err instanceof mongoose.Error.ValidationError) {
            const schema_err = Object.values(err.errors)[0];
            return res.status(400).json({ error: schema_err.message });
        }
        res.status(500).json({ error: err.message });
    }
}

async function updateDoctorStatus(req, res) {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.body.id);
        const { status } = req.body;
        const doctor = await Doctor.findById(doctorId);
        if (!doctor)
            return res.status(404).json({ msg: "Doctor not found", found: false });

        if (status) doctor.status = status;
        await doctor.save();

        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today });

        let queueStatus = null;
        let cancelledCount = 0;
        if (queue) {
            if (status === "break") {
                queue.status = "PAUSED";
                queue.waitingSince = null;
            } else if (status === "offline") {
                queue.status = "CLOSED";
                queue.closedAt = new Date();
                queue.waitingSince = null;
                const result = await cancelQueueAppointments(queue._id);
                cancelledCount = result.cancelledCount || 0;
            } else if (status === "available" || status === "inroom" || status === "emergency") {
                queue.status = "OPEN";
                
                if (status === "available" && queue.waiting.length > 0 && !queue.currentPatient) {
                    queue.waitingSince = new Date();
                }
            }
            await queue.save();
            queueStatus = queue.status;
            const { updateQueueExpectedTimes } = require("./queueController");
            await updateQueueExpectedTimes(queue._id);
        }

        res.json({
            msg: "Doctor status updated",
            doctorStatus: status,
            queueStatus,
            appointmentsCancelled: cancelledCount,
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getStatusAndCapacity(req, res) {
    try {
        const doctorId = req.params.doctorId;
        const d = await Doctor.findOne({ id: doctorId });
        if (!d)
            return res.status(404).json({ msg: "Not found", found: false });
        res.json({ status: d.status, capacity: d.dailyCapacity, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function createQueue(req, res) {
    try {
        const { doctorId, staffId, capacity } = req.body;
        const d = await Doctor.findById(doctorId);
        if (!d)
            return res.status(404).json({ msg: "Doctor not found", found: false });

        const today = new Date().toISOString().split("T")[0];
        const qexist = await Queue.findOne({ doctorId, date: today });
        if (qexist)
            return res.status(400).json({ msg: "Queue already created today", found: false });

                const s = await Staff.findOne({ staffId });
        if (!s)
            return res.status(404).json({ msg: "Staff not found", found: false });

        
        const existingAnyAssignment = await StaffAssignment.findOne({
            staffId: s._id,
            assignedAt: today,
            active: true
        });
        if (existingAnyAssignment) {
            return res.status(400).json({ msg: "Staff is already assigned to a doctor today.", found: false });
        }

        d.dailyCapacity = capacity;
        d.status = "available";
        d.schedule.push({ date: Date.now(), slots: capacity });
        await d.save();

        const q = new Queue({
            hospitalId: d.hospitalId,
            departmentId: d.departmentId,
            doctorId: d._id,
            status: "OPEN",
            maxCapacity: capacity,
            bookedAppointments: 0
        });
        await q.save();

        
        const existingAssignment = await StaffAssignment.findOne({
            staffId: s._id, doctorId: d._id, assignedAt: today
        });
        if (!existingAssignment) {
            const assignment = new StaffAssignment({
                staffId: s._id,
                doctorId: d._id,
                queueId: q._id
            });
            await assignment.save();
        }

        res.status(201).json({ msg: "Queue created successfully", queueId: q._id, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function markAsComplete(req, res) {
    try {
        const { queueId, prescriptionText, prescriptionUrl } = req.body;
        const q = await Queue.findById(queueId);
        if (!q)
            return res.status(404).json({ found: false, msg: "Queue not found" });

        const appointmentId = q.currentPatient;
        if (!appointmentId)
            return res.status(400).json({ found: false, msg: "No current patient" });

        
        const a = await Appointment.findById(appointmentId);
        if (a) {
            a.status = "COMPLETED";
            a.completedAt = new Date();
            a.prescriptionText = prescriptionText || "";
            a.prescriptionUrl = prescriptionUrl || "";
            await a.save();

            
            const patient = await Patient.findById(a.patientId);
            if (patient && patient.email) {
                const doctor = await Doctor.findById(q.doctorId);
                const doctorName = doctor?.name || "your doctor";
                const html = buildCompletionEmail(patient.name, doctorName, a.prescriptionText, a.prescriptionUrl);
                await sendEmail(
                    patient.email,
                    `🏥 SmartCareQ: Consultation Completed - Dr. ${doctorName}`,
                    html
                );
            }
        }

        
        q.currentPatient = null;

        
        const doctor = await Doctor.findById(q.doctorId);
        if (doctor) {
            doctor.status = "available";
            await doctor.save();
        }

        
        if (q.waiting.length > 0) {
            q.waitingSince = new Date();
            
            const { notifyNextPatient } = require("./queueController");
            await notifyNextPatient(q);
        } else {
            q.waitingSince = null;
        }

        await q.save();
        const { updateQueueExpectedTimes } = require("./queueController");
        await updateQueueExpectedTimes(q._id);

        const completedCount = await Appointment.countDocuments({ queueId, status: "COMPLETED" });
        res.json({
            appointmentId,
            msg: "Successfully marked as completed",
            found: true,
            waitingCount: q.waiting.length,
            completedCount,
            skippedCount: q.skipped.length
        });
    } catch (err) {
        console.error("markAsComplete error:", err);
        res.status(500).json({ error: err.message });
    }
}

async function addNotes(req, res) {
    try {
        const { notes } = req.body;
        const appId = req.params.appointmentId;
        const a = await Appointment.findById(appId);
        if (!a)
            return res.status(404).json({ msg: "Appointment not found", found: false });
        a.notes = notes;
        await a.save();
        res.json({ found: true, notes, appointment: a });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function cancelQueue(req, res) {
    try {
        const { queueId } = req.body;
        const q = await Queue.findById(queueId);
        if (!q) return res.status(404).json({ msg: "Queue not found" });

        const doctor = await Doctor.findById(q.doctorId);
        const doctorName = doctor?.name || "your doctor";

        const Payment = require("../models/Payment");

        let refundedCount = 0;
        let cancelledCount = 0;
        const refundResults = [];

        
        const waitingIds = [...q.waiting];
        const skippedIds = [...q.skipped || []];
        const allToCancel = [...waitingIds, ...skippedIds];
        for (const appId of allToCancel) {
            const appointment = await Appointment.findById(appId);
            if (!appointment) continue;

            appointment.status = "CANCELLED";
            await appointment.save();
            cancelledCount++;

            
            if (appointment.paymentId) {
                const payment = await Payment.findById(appointment.paymentId);
                if (payment && payment.status === "PAID") {
                    let refundSuccess = false;

                    
                    if (payment.razorpayPaymentId && (payment.method === "ONLINE" || payment.method === "RAZORPAY")) {
                        try {
                            const Razorpay = require("razorpay");
                            const rzp = new Razorpay({
                                key_id: process.env.RAZORPAY_KEY_ID,
                                key_secret: process.env.RAZORPAY_KEY_SECRET
                            });
                            await rzp.payments.refund(payment.razorpayPaymentId, {
                                amount: payment.amount * 100 
                            });
                            refundSuccess = true;
                            console.log(`✅ Razorpay refund issued for payment ${payment.razorpayPaymentId}`);
                        } catch (rzpErr) {
                            console.error(`⚠️ Razorpay refund failed for ${payment.razorpayPaymentId}:`, rzpErr.message);
                            
                            refundSuccess = true;
                        }
                    } else {
                        
                        refundSuccess = true;
                    }

                    if (refundSuccess) {
                        payment.status = "REFUNDED";
                        payment.refundDate = new Date();
                        await payment.save();
                        refundedCount++;
                        refundResults.push({
                            appointmentId: appId,
                            amount: payment.amount,
                            method: payment.method,
                            status: "REFUNDED"
                        });
                    }
                }
            }

            
            const patient = await Patient.findById(appointment.patientId);
            if (patient && patient.email) {
                const html = buildQueueCancelledEmail(patient.name, doctorName);
                await sendEmail(
                    patient.email,
                    `🏥 SmartCareQ: Appointment Cancelled - Dr. ${doctorName}`,
                    html
                );
            }
        }

        
        if (q.currentPatient) {
            const currentApp = await Appointment.findById(q.currentPatient);
            if (currentApp && currentApp.status !== "COMPLETED") {
                currentApp.status = "CANCELLED";
                await currentApp.save();
                cancelledCount++;
            }
            q.currentPatient = null;
        }

        
        q.waiting = [];
        q.skipped = [];
        q.status = "CLOSED";
        q.closedAt = new Date();
        q.waitingSince = null;
        await q.save();

        
        if (doctor) {
            doctor.status = "offline";
            await doctor.save();
        }

        res.json({
            msg: "Queue cancelled and refunds initiated",
            cancelledCount,
            refundedCount,
            refundResults
        });
    } catch (err) {
        console.error("cancelQueue error:", err);
        res.status(500).json({ error: err.message });
    }
}

async function updateDoctorProfile(req, res) {
    try {
        const id = req.user.id;
        const { name, phone, email, password } = req.body;
        const d = await Doctor.findOne({ id });
        if (!d)
            return res.status(404).json({ msg: "Doctor not found", found: false });

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updated = await Doctor.findOneAndUpdate({ id }, updateData, { new: true });
        res.json({ msg: "Updated successfully", found: true, doctor: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getDoctorQueueDetails(req, res) {
    try {
        const doctorId = req.user._id;
        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today })
            .populate({
                path: 'waiting',
                populate: { path: 'patientId', select: 'name phone' }
            })
            .populate({
                path: 'skipped',
                populate: { path: 'patientId', select: 'name phone' }
            })
            .populate({
                path: 'currentPatient',
                populate: { path: 'patientId', select: 'name phone' }
            });

        if (!queue) {
            return res.status(200).json({ msg: "No active queue found for today", found: false });
        }

        res.json({ queue, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    addDoctor, deleteDoctor, updateDoctor, getDoctorsByDept,
    addNotes, markAsComplete, createQueue, getStatusAndCapacity,
    updateDoctorStatus, setCapacity, getDoctors, getDoctorById,
    cancelQueue, updateDoctorProfile, getDoctorQueueDetails
};