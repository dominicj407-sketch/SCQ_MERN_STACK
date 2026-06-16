const Queue = require("../models/Queue");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const mongoose = require('mongoose');
const StaffAssignment = require("../models/StaffAssignment");
const Patient = require("../models/Patient");
const { sendEmail, buildPositionOneEmail, buildCompletionEmail, buildSkippedEmail, buildEmergencyPriorityEmail, buildQueuePushedEmail } = require("../utils/emailService");

async function notifyNextPatient(queue) {
    if (queue.waiting.length === 0) return;
    const nextAppId = queue.waiting[0];
    const appointment = await Appointment.findById(nextAppId);
    if (!appointment) return;
    const patient = await Patient.findById(appointment.patientId);
    if (!patient) return;

    const doctor = await Doctor.findById(queue.doctorId);
    const doctorName = doctor?.name || 'your doctor';



    
    if (patient.email) {
        const html = buildPositionOneEmail(patient.name, doctorName, appointment.tokenNumber);
        await sendEmail(
            patient.email,
            `🏥 SmartCareQ: You're Next in Queue! Token #${appointment.tokenNumber}`,
            html
        );
    }
}


async function verifyAndAdmitPatient(req, res) {
    try {
        const { queueId, appointmentId } = req.body;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Queue not found", found: false });

        if (req.user && req.user.role === 'Staff') {
            
            const assignment = await StaffAssignment.findOne({ staffId: req.user.id, doctorId: queue.doctorId, active: true });
            if (!assignment) return res.status(403).json({ msg: "Unauthorized: Not assigned to this queue.", found: false });
        } else if (req.user && req.user.role === 'Doctor') {
            if (queue.doctorId.toString() !== req.user._id && queue.doctorId.toString() !== req.user.id) {
                return res.status(403).json({ msg: "Unauthorized: Not your queue.", found: false });
            }
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment)
            return res.status(404).json({ msg: "Appointment not found", found: false });

        
        if (appointment.status === "SKIPPED") {
            
            if (queue.currentPatient) {
                return res.status(409).json({
                    msg: "Please wait. Another patient is currently inside the doctor's room. You'll be added to the queue once they're done.",
                    found: false
                });
            }

            const skipIdx = queue.skipped.findIndex(i => i.toString() === appointmentId);
            if (skipIdx !== -1) {
                queue.skipped.splice(skipIdx, 1);
            }
            appointment.status = "WAITING";
            await appointment.save();

            
            queue.waiting.unshift(new mongoose.Types.ObjectId(appointmentId));
            queue.waitingSince = new Date();
            await queue.save();
            await updateQueueExpectedTimes(queue._id);

            const patient = await Patient.findById(appointment.patientId);
            return res.json({
                msg: "Skipped patient rejoined at top of queue",
                rejoined: true,
                admitted: false,
                position: 1,
                patientName: patient?.name || "Unknown",
                found: true
            });
        }

        
        if (queue.currentPatient) {
            return res.status(409).json({ msg: "Please wait. Another patient is currently inside the doctor's room.", found: false });
        }

        if (queue.waiting.length === 0)
            return res.status(400).json({ msg: "No patients in waiting queue", found: false });

        const firstInQueue = queue.waiting[0].toString();
        if (firstInQueue !== appointmentId) {
            
            const pos = queue.waiting.findIndex(i => i.toString() === appointmentId);
            if (pos === -1)
                return res.status(400).json({ msg: "Appointment not in this queue", found: false });
            return res.status(400).json({
                msg: "Not your turn yet",
                position: pos + 1,
                found: false
            });
        }

        
        queue.waiting.shift();
        queue.currentPatient = new mongoose.Types.ObjectId(appointmentId);
        queue.waitingSince = null; 

        appointment.status = "IN_ROOM";
        appointment.startedAt = new Date();
        await appointment.save();

        const doctor = await Doctor.findById(queue.doctorId);
        if (doctor) {
            doctor.status = "inroom";
            await doctor.save();
        }

        await queue.save();
        await updateQueueExpectedTimes(queue._id);

        const patient = await Patient.findById(appointment.patientId);
        return res.json({
            msg: "Patient admitted successfully",
            admitted: true,
            rejoined: false,
            patientName: patient?.name || "Unknown",
            appointmentId: appointment._id,
            found: true
        });
    } catch (err) {
        console.error("verifyAndAdmitPatient error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function markCompleteAndAdvance(req, res) {
    try {
        const { queueId, prescriptionText, prescriptionUrl } = req.body;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Queue not found", found: false });

        
        if (queue.currentPatient) {
            const appointment = await Appointment.findById(queue.currentPatient);
            if (appointment) {
                appointment.status = "COMPLETED";
                appointment.prescriptionText = prescriptionText || "";
                appointment.prescriptionUrl = prescriptionUrl || "";
                await appointment.save();

                
                const patient = await Patient.findById(appointment.patientId);
                if (patient && patient.email) {
                    const doctor = await Doctor.findById(queue.doctorId);
                    const doctorName = doctor?.name || "your doctor";
                    const html = buildCompletionEmail(patient.name, doctorName, appointment.prescriptionText, appointment.prescriptionUrl);
                    await sendEmail(
                        patient.email,
                        `🏥 SmartCareQ: Consultation Completed - Dr. ${doctorName}`,
                        html
                    );
                }
            }
        }

        
        queue.currentPatient = null;

        
        const doctor = await Doctor.findById(queue.doctorId);
        if (doctor) {
            doctor.status = "available";
            await doctor.save();
        }

        
        if (queue.waiting.length > 0) {
            queue.waitingSince = new Date();
            await queue.save();
            await updateQueueExpectedTimes(queue._id);

            
            await notifyNextPatient(queue);

            const completedCount = await Appointment.countDocuments({ queueId, status: "COMPLETED" });
            return res.json({
                msg: "Patient completed. Waiting for next patient to scan QR.",
                found: true,
                waitingForNext: true,
                waitingCount: queue.waiting.length,
                completedCount,
                skippedCount: queue.skipped.length
            });
        } else {
            queue.waitingSince = null;
            await queue.save();
            await updateQueueExpectedTimes(queue._id);

            const completedCount = await Appointment.countDocuments({ queueId, status: "COMPLETED" });
            return res.json({
                msg: "Patient completed. No more patients in queue.",
                found: true,
                waitingForNext: false,
                waitingCount: 0,
                completedCount,
                skippedCount: queue.skipped.length
            });
        }
    } catch (err) {
        console.error("markCompleteAndAdvance error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function skipCurrentWaiting(req, res) {
    try {
        const { queueId } = req.body;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Queue not found", found: false });

        if (req.user && req.user.role === 'Staff') {
            const assignment = await StaffAssignment.findOne({ staffId: req.user.id, doctorId: queue.doctorId, active: true });
            if (!assignment) return res.status(403).json({ msg: "Unauthorized: Not assigned to this queue.", found: false });
        } else if (req.user && req.user.role === 'Doctor') {
            if (queue.doctorId.toString() !== req.user._id && queue.doctorId.toString() !== req.user.id) {
                return res.status(403).json({ msg: "Unauthorized: Not your queue.", found: false });
            }
        }

        if (queue.waiting.length === 0)
            return res.status(400).json({ msg: "No patients in waiting queue", found: false });

        
        const skippedAppId = queue.waiting.shift();
        queue.skipped.push(skippedAppId);

        const appointment = await Appointment.findById(skippedAppId);
        if (appointment) {
            appointment.status = "SKIPPED";
            await appointment.save();

            
            const patient = await Patient.findById(appointment.patientId);
            if (patient && patient.email) {
                const doctor = await Doctor.findById(queue.doctorId);
                const doctorName = doctor?.name || "your doctor";
                const html = buildSkippedEmail(patient.name, doctorName);
                await sendEmail(
                    patient.email,
                    `🏥 SmartCareQ: You Have Been Skipped`,
                    html
                );
            }
        }

        
        if (queue.waiting.length > 0) {
            queue.waitingSince = new Date();
            await queue.save();
            await updateQueueExpectedTimes(queue._id);

            
            await notifyNextPatient(queue);
        } else {
            queue.waitingSince = null;
            await queue.save();
            await updateQueueExpectedTimes(queue._id);
        }

        return res.json({
            msg: "Patient skipped due to no-show",
            skippedAppointmentId: skippedAppId,
            waitingCount: queue.waiting.length,
            found: true
        });
    } catch (err) {
        console.error("skipCurrentWaiting error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function getNoShowStatus(req, res) {
    try {
        const queueId = req.params.queueId;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Queue not found", found: false });

        
        if (queue.currentPatient || queue.waiting.length === 0 || !queue.waitingSince) {
            return res.json({
                timerActive: false,
                elapsed: 0,
                timedOut: false,
                found: true
            });
        }

        const elapsed = Math.floor((Date.now() - new Date(queue.waitingSince).getTime()) / 1000);
        return res.json({
            timerActive: true,
            elapsed,
            timedOut: elapsed >= 120, 
            firstWaitingAppointmentId: queue.waiting[0],
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}



async function getLiveDisplayData(req, res) {
    try {
        const today = new Date().toISOString().split("T")[0];
        const queues = await Queue.find({ date: today })
            .populate("doctorId", "name status")
            .populate("departmentId", "name")
            .populate({
                path: "currentPatient",
                select: "tokenNumber patientId",
                populate: {
                    path: "patientId",
                    select: "name"
                }
            })
            .populate({
                path: "waiting",
                select: "tokenNumber patientId",
                populate: {
                    path: "patientId",
                    select: "name"
                }
            });

        res.json({ queues, found: true });
    } catch (err) {
        console.error("getLiveDisplayData error:", err);
        res.status(500).json({ error: err.message });
    }
}

async function getQueueStatus(req, res) {
    try {
        const qid = req.params.queueId;
        const q = await Queue.findById(qid);
        if (!q)
            return res.status(404).json({ msg: "Queue not found", found: false });

        const completedCount = await Appointment.countDocuments({ queueId: qid, status: "COMPLETED" });

        res.json({
            queue: q,
            waitingCount: q.waiting.length,
            skippedCount: q.skipped.length,
            completedCount,
            found: true
        });
    } catch (err) {
        console.error("getQueueStatus error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function getQueueIdbyDid(req, res) {
    try {
        const did = req.params.did;
        const dat = new Date().toISOString().split('T')[0];
        const d = await Queue.findOne({ doctorId: did, date: dat });
        if (!d)
            return res.status(404).json({ msg: "Queue is not available", found: false });
        res.status(200).json({
            queueId: d._id,
            found: true,
            limit: d.maxCapacity,
            booked: d.bookedAppointments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAssignedQueues(req, res) {
    try {
        const staffId = req.user.id;
        const today = new Date().toISOString().split("T")[0];
        const results = await StaffAssignment.find({ staffId, assignedAt: today, active: true }).populate("doctorId", "name");
        let queuesToReturn = [];

        for (const assignment of results) {
            if (assignment.doctorId) {
                const todayQueue = await Queue.findOne({ doctorId: assignment.doctorId._id, date: today })
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
                if (todayQueue) {
                    const completedCount = await Appointment.countDocuments({
                        queueId: todayQueue._id, status: "COMPLETED"
                    });
                    const assignmentObj = assignment.toObject();
                    assignmentObj.queueId = todayQueue;
                    assignmentObj.completedCount = completedCount;
                    queuesToReturn.push(assignmentObj);
                }
            }
        }

        if (queuesToReturn.length === 0)
            return res.status(404).json({ err: "No queues found for today", assign: false });

        res.json({ assign: true, queues: queuesToReturn });
    } catch (err) {
        console.error("getAssignedQueues error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function viewCurrentPatientBydoctorId(req, res) {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.params.doctorId);
        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today });

        if (!queue)
            return res.status(404).json({ msg: "No queue found", found: false });

        if (!queue.currentPatient) {
            
            if (queue.status === "PAUSED") {
                return res.json({
                    msg: "Queue is paused",
                    waitingForScan: true,
                    elapsed: 0,
                    waitingCount: queue.waiting.length,
                    queueStatus: "PAUSED",
                    found: true
                });
            }

            
            if (queue.waiting.length > 0 && queue.waitingSince) {
                const elapsed = Math.floor((Date.now() - new Date(queue.waitingSince).getTime()) / 1000);
                return res.json({
                    msg: "Waiting for patient to scan QR",
                    waitingForScan: true,
                    elapsed,
                    waitingCount: queue.waiting.length,
                    queueStatus: queue.status,
                    found: true
                });
            }
            
            if (queue.waiting.length > 0) {
                
                queue.waitingSince = new Date();
                await queue.save();
                return res.json({
                    msg: "Waiting for patient to scan QR",
                    waitingForScan: true,
                    elapsed: 0,
                    waitingCount: queue.waiting.length,
                    queueStatus: queue.status,
                    found: true
                });
            }
            return res.status(200).json({ msg: "No patients", found: false, queueStatus: queue.status });
        }

        const appointment = await Appointment.findById(queue.currentPatient);
        if (!appointment) {
            
            queue.currentPatient = null;
            await queue.save();
            return res.status(200).json({ msg: "No patients", found: false, queueStatus: queue.status });
        }

        const patient = await Patient.findById(appointment.patientId);
        res.json({
            currentPatient: patient || { name: "Unknown Patient" },
            currentAppointment: appointment,
            queueId: queue._id,
            queueStatus: queue.status,
            found: true
        });
    } catch (err) {
        console.error("viewCurrentPatientBydoctorId error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function viewCurrentPatientByqueueId(req, res) {
    try {
        const queueId = req.params.queueId;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Not found", found: false });
        res.json({ currentPatient: queue.currentPatient, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function pauseQueue(req, res) {
    try {
        const queueId = req.params.queueId;
        const q = await Queue.findById(queueId);
        if (!q) return res.status(404).json({ msg: "Queue not found", found: false });
        q.status = "PAUSED";
        q.waitingSince = null; 
        await q.save();
        res.json({ msg: "Queue paused", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function resumeQueue(req, res) {
    try {
        const queueId = req.params.queueId;
        const q = await Queue.findById(queueId);
        if (!q) return res.status(404).json({ msg: "Queue not found" });
        q.status = "OPEN";
        
        if (q.waiting.length > 0 && !q.currentPatient) {
            q.waitingSince = new Date();
        }
        await q.save();
        await updateQueueExpectedTimes(q._id);
        res.json({ msg: "Queue resumed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function cancelQueueAppointments(queueId) {
    try {
        const queue = await Queue.findById(queueId);
        if (!queue || (queue.waiting.length === 0 && queue.skipped.length === 0))
            return { cancelledCount: 0 };

        let cancelledCount = 0;
        const allToCancel = [...queue.waiting, ...queue.skipped || []];
        for (const appId of allToCancel) {
            const appointment = await Appointment.findById(appId);
            if (appointment) {
                appointment.status = "CANCELLED";
                await appointment.save();
                cancelledCount++;
            }
        }

        queue.waiting = [];
        queue.skipped = [];
        queue.waitingSince = null;
        if (cancelledCount > 0) {
            queue.bookedAppointments = Math.max(0, (queue.bookedAppointments || 0) - cancelledCount);
        }
        await queue.save();
        return { cancelledCount };
    } catch (err) {
        console.error("Error cancelling queue appointments:", err.message);
        return { error: err.message };
    }
}


async function emergencyOverride(req, res) {
    try {
        const { queueId, appointmentId } = req.body;
        const queue = await Queue.findById(queueId);
        if (!queue)
            return res.status(404).json({ msg: "Queue not found", found: false });

        
        if (!req.user) {
            return res.status(401).json({ msg: "Unauthorized", found: false });
        }

        if (req.user.role === 'Staff') {
            const assignment = await StaffAssignment.findOne({ staffId: req.user.id, doctorId: queue.doctorId, active: true });
            if (!assignment) return res.status(403).json({ msg: "Unauthorized: Not assigned to this queue.", found: false });
        } else if (req.user.role === 'Doctor') {
            if (queue.doctorId.toString() !== req.user._id && queue.doctorId.toString() !== req.user.id) {
                return res.status(403).json({ msg: "Unauthorized: Not your queue.", found: false });
            }
        } else {
            return res.status(403).json({ msg: "Forbidden: Only Doctor and Staff can perform emergency override.", found: false });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment)
            return res.status(404).json({ msg: "Appointment not found", found: false });

        
        const idx = queue.waiting.findIndex(i => i.toString() === appointmentId);
        if (idx === -1) {
            return res.status(400).json({ msg: "Patient is not in the waiting queue" });
        }

        
        if (idx === 0) {
            return res.json({ msg: "Patient is already next in line", queue: queue.waiting, found: true });
        }

        
        const pushedAppId = queue.waiting[0];

        
        queue.waiting.splice(idx, 1);
        queue.waiting.unshift(appointment._id);

        await queue.save();
        await updateQueueExpectedTimes(queue._id);

        
        const emergencyPatient = await Patient.findById(appointment.patientId);
        if (emergencyPatient && emergencyPatient.email) {
            const html = buildEmergencyPriorityEmail(emergencyPatient.name, appointment.tokenNumber);
            await sendEmail(
                emergencyPatient.email,
                `🚨 SmartCareQ: Emergency Priority Flagged! Token #${appointment.tokenNumber}`,
                html
            );
        }

        
        if (pushedAppId) {
            const pushedApp = await Appointment.findById(pushedAppId);
            if (pushedApp) {
                const pushedPatient = await Patient.findById(pushedApp.patientId);
                if (pushedPatient && pushedPatient.email) {
                    const html = buildQueuePushedEmail(pushedPatient.name);
                    await sendEmail(
                        pushedPatient.email,
                        `🏥 SmartCareQ: Queue Update Alert`,
                        html
                    );
                }
            }
        }

        res.json({ msg: "Emergency override successful", queue: queue.waiting, found: true });
    } catch (err) {
        console.error("emergencyOverride error:", err);
        res.status(500).json({ error: err.message });
    }
}


async function verifyPatient(req, res) {
    try {
        const { queueId, appointmentId } = req.body;
        const q = await Queue.findById(queueId);
        if (!q)
            return res.status(404).json({ msg: "Queue not found", found: false });
        const idx = q.waiting.findIndex(i => i.toString() === appointmentId);
        if (idx === -1)
            return res.status(400).json({ msg: "Patient not in waiting queue" });
        if (idx === 0)
            return res.json({ msg: "Patient verified", allow: true });
        res.json({ allow: false, msg: "Patient must wait", position: idx + 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function insertPatient(req, res) {
    try {
        const queueId = req.params.queueId;
        const { appointmentId, position } = req.body;
        const q = await Queue.findById(queueId);
        if (!q)
            return res.status(404).json({ msg: "Queue not found", found: false });
        const pos = Math.max(0, Math.min(position, q.waiting.length));
        q.waiting.splice(pos, 0, appointmentId);
        await q.save();
        await updateQueueExpectedTimes(q._id);
        res.json({ msg: "Patient inserted", queue: q.waiting, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function reorderQueue(req, res) {
    try {
        const queueId = req.params.queueId;
        const { newOrder } = req.body;
        const q = await Queue.findById(queueId);
        if (!q)
            return res.status(404).json({ msg: "Queue not found", found: false });
        q.waiting = newOrder;
        await q.save();
        await updateQueueExpectedTimes(q._id);
        res.json({ msg: "Queue reordered", found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function updateQueueExpectedTimes(queueId) {
    try {
        const Queue = require("../models/Queue");
        const Appointment = require("../models/Appointment");

        const q = await Queue.findById(queueId);
        if (!q) return;

        
        const completedApps = await Appointment.find({
            doctorId: q.doctorId, queueId: q._id, status: "COMPLETED",
            startedAt: { $ne: null }, completedAt: { $ne: null }
        });

        let avgConsultTime = 10; 
        if (completedApps.length > 0) {
            const totalMins = completedApps.reduce((sum, app) => {
                const duration = (new Date(app.completedAt) - new Date(app.startedAt)) / 60000;
                return sum + Math.max(1, Math.min(duration, 60));
            }, 0);
            avgConsultTime = Math.round(totalMins / completedApps.length);
        }

        
        const now = Date.now();
        let baseRemainingTime = 0; 

        if (q.currentPatient) {
            
            const currentApp = await Appointment.findById(q.currentPatient);
            if (currentApp && currentApp.startedAt) {
                const elapsedTime = (now - new Date(currentApp.startedAt).getTime()) / 60000; 
                baseRemainingTime = Math.max(0, avgConsultTime - elapsedTime);
            } else {
                baseRemainingTime = avgConsultTime;
            }
        } else {
            
            let remainingArrivalDeadline = 2; 
            if (q.waitingSince) {
                const elapsedSeconds = (now - new Date(q.waitingSince).getTime()) / 1000;
                remainingArrivalDeadline = Math.max(0, 120 - elapsedSeconds) / 60; 
            }
            baseRemainingTime = remainingArrivalDeadline;
        }

        
        for (let i = 0; i < q.waiting.length; i++) {
            const appId = q.waiting[i];
            const patientsAhead = i; 
            const eta = baseRemainingTime + (patientsAhead * avgConsultTime); 
            const expectedTime = new Date(now + eta * 60 * 1000);
            await Appointment.findByIdAndUpdate(appId, { expectedTime });
        }

        
        if (q.currentPatient) {
            await Appointment.findByIdAndUpdate(q.currentPatient, { expectedTime: new Date(now) });
        }
    } catch (err) {
        console.error("Error updating queue expected times:", err);
    }
}

module.exports = {
    getQueueIdbyDid,
    getQueueStatus,
    getAssignedQueues,
    viewCurrentPatientBydoctorId,
    viewCurrentPatientByqueueId,
    resumeQueue,
    pauseQueue,
    reorderQueue,
    insertPatient,
    verifyPatient,
    verifyAndAdmitPatient,
    markCompleteAndAdvance,
    skipCurrentWaiting,
    getNoShowStatus,
    cancelQueueAppointments,
    notifyNextPatient,
    emergencyOverride,
    getLiveDisplayData,
    updateQueueExpectedTimes
};
