const Patient = require("../models/Patient.js");
const Queue = require("../models/Queue.js");
const Doctor = require("../models/Doctor.js");
const Appointment = require("../models/Appointment.js");
const Payment = require("../models/Payment.js");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const { updateQueueExpectedTimes } = require("./queueController.js");
const { sendEmail, buildBookingEmail, buildPositionOneEmail, buildSkippedEmail, buildMasterPasswordEmail } = require("../utils/emailService.js");



async function registerPatient(req, res) {
    try {
        const { name, phone, email, password, age, gender } = req.body;
        const existing = await Patient.findOne({ email });
        if (existing)
            return res.status(409).json({ msg: "Already registered", found: false });

        const hashedPassword = await bcrypt.hash(password, 10);

        
        const crypto = require("crypto");
        const masterPasswordText = 'MP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const hashedMasterPassword = await bcrypt.hash(masterPasswordText, 10);

        const patient = new Patient({
            name, phone, email,
            password: hashedPassword,
            masterPassword: hashedMasterPassword,
            age, gender
        });
        await patient.save();

        
        try {
            const emailHtml = buildMasterPasswordEmail(name, "Patient", masterPasswordText);
            await sendEmail(email, "🔑 SmartCareQ: Your Recovery Master Password", emailHtml);
        } catch (mailErr) {
            console.error("Failed to send master password email to patient:", mailErr.message);
        }

        res.json({ msg: "Registered successfully", patientId: patient._id, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getPatients(req, res) {
    try {
        const patients = await Patient.find().select("-password");
        res.json(patients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getPatientById(req, res) {
    try {
        const id = req.user.id;
        const patient = await Patient.findById(id);
        if (!patient)
            return res.status(404).json({ found: false, msg: "Not found" });
        res.status(200).json({ p: patient, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function updatePatient(req, res) {
    try {
        const id = req.params.id;
        const patient = await Patient.findByIdAndUpdate(id, req.body);
        if (!patient)
            return res.status(404).json({ found: false, msg: "Not found" });
        res.json({ patient, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function deletePatient(req, res) {
    try {
        const id = req.params.id;
        const patient = await Patient.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!patient)
            return res.status(404).json({ message: "Patient not found", found: false });
        res.json({ message: "Patient deleted successfully", deletedPatient: patient, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function validateBooking(req, res) {
    try {
        const { patientId, doctorId } = req.body;

        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ msg: "Doctor not found.", found: false });
        }
        if (doctor.status !== "available" && doctor.status !== "inroom") {
            return res.status(400).json({ msg: `Doctor is currently ${doctor.status}. Booking is only allowed when the doctor is available.`, found: false });
        }

        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const activeToday = await Appointment.findOne({
            patientId,
            bookedAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $nin: ["CANCELLED", "COMPLETED"] }
        });
        if (activeToday) {
            return res.status(409).json({
                msg: "You already have an active appointment for today. Please complete or cancel it before booking another.",
                found: false
            });
        }

        
        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today });
        if (!queue) {
            return res.status(400).json({ msg: "Queue not found for today. The doctor is not accepting appointments.", found: false });
        }
        if (queue.status === "CLOSED") {
            return res.status(400).json({ msg: "Queue is closed for today.", found: false });
        }
        if (queue.maxCapacity > 0 && queue.bookedAppointments >= queue.maxCapacity) {
            return res.status(400).json({ msg: "No slots left. Doctor daily capacity reached.", found: false });
        }

        const slotsRemaining = queue.maxCapacity > 0 ? queue.maxCapacity - queue.bookedAppointments : "unlimited";
        return res.status(200).json({ valid: true, slotsRemaining });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error" });
    }
}


async function bookAppointment(req, res) {
    try {
        const { patientId, doctorId, departmentId, paymentId, reports, isOffline } = req.body;

        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ msg: "Doctor not found", found: false });
        }
        if (doctor.status !== "available" && doctor.status !== "inroom") {
            return res.status(400).json({ msg: `Doctor is currently ${doctor.status}. Cannot book when doctor is not available.`, found: false });
        }

        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const activeToday = await Appointment.findOne({
            patientId,
            bookedAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $nin: ["CANCELLED", "COMPLETED"] }
        });
        if (activeToday) {
            return res.status(409).json({
                msg: "You already have an active appointment for today. Please complete or cancel it before booking another.",
                found: false,
                existingAppointmentId: activeToday._id
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment || payment.status !== "PAID") {
            return res.status(402).json({ message: "Payment required before booking appointment", found: false });
        }

        const today = new Date().toISOString().split("T")[0];
        const queue = await Queue.findOne({ doctorId, date: today });
        if (!queue)
            return res.status(400).json({ msg: "Queue not found for today", found: false });
        if (queue.status === "CLOSED")
            return res.status(400).json({ msg: "Queue is closed for today", found: false });

        if (queue.maxCapacity > 0 && queue.bookedAppointments >= queue.maxCapacity)
            return res.status(400).json({ msg: "No slots left. Doctor daily capacity reached.", found: false });

        const tokenNumber = queue.bookedAppointments + 1;
        queue.bookedAppointments += 1;
        const appointment = new Appointment({
            patientId, doctorId, departmentId,
            queueId: queue._id,
            paymentId, tokenNumber,
            status: "WAITING",
            isOffline: !!isOffline,
            reports: reports || []
        });

        const qrData = {
            appointmentId: appointment._id,
            patientId, doctorId,
            tokenNumber, date: today
        };
        const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));
        appointment.qrCode = qrCodeImage;
        await appointment.save();

        if (isOffline) {
            const count = queue.offlineCount || 0;
            const targetIndex = count * 5 + 4;
            queue.offlineCount = count + 1;

            if (targetIndex >= queue.waiting.length) {
                queue.waiting.push(appointment._id);
            } else {
                queue.waiting.splice(targetIndex, 0, appointment._id);
            }
        } else {
            queue.waiting.push(appointment._id);
        }

        const patient = await Patient.findById(patientId);

        
        if (patient && patient.email) {
            const html = buildBookingEmail(patient.name, doctor.name, tokenNumber, today);
            await sendEmail(
                patient.email,
                `🏥 SmartCareQ: Booking Confirmed! Token #${tokenNumber}`,
                html
            );
        }

        
        if (queue.waiting.length === 1 && !queue.currentPatient && !queue.waitingSince) {
            queue.waitingSince = new Date();
            if (patient && patient.email) {
                
                const html = buildPositionOneEmail(patient.name, doctor.name, tokenNumber);
                await sendEmail(
                    patient.email,
                    `🏥 SmartCareQ: You're Next in Queue! Token #${tokenNumber}`,
                    html
                );
            }
        }

        await queue.save();
        await updateQueueExpectedTimes(queue._id);

        return res.status(201).json({
            msg: "Appointment booked successfully",
            tokenNumber,
            qrCode: qrCodeImage,
            appId: appointment._id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}


async function removeAppointment(req, res) {
    try {
        const appointmentId = req.params.appId;
        const app = await Appointment.findById(appointmentId);
        if (!app)
            return res.status(404).json({ err: "Appointment not found", found: false });

        const payment = await Payment.findById(app.paymentId);
        if (payment) {
            payment.status = "REFUNDED";
            await payment.save();
        }

        app.status = "CANCELLED";
        await app.save();

        res.json({ msg: "Deleted successfully", appId: app._id, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getPosition(req, res) {
    try {
        const appId = req.params.appId;
        const app = await Appointment.findById(appId);
        if (!app)
            return res.status(404).json({ err: "Appointment not found", found: false });

        const q = await Queue.findById(app.queueId);
        if (!q)
            return res.status(404).json({ error: "Queue invalid", found: false });

        if (q.currentPatient && q.currentPatient.toString() === appId)
            return res.json({ appId, currentPatient: true, position: 0, found: true });

        const idx = q.waiting.findIndex(i => i.toString() === appId);
        if (idx !== -1) {
            const response = { appId, currentPatient: false, position: idx + 1, waitingPatient: true, found: true };
            if (idx === 0) {
                response.waitingSince = q.waitingSince;
                response.queueStatus = q.status;
            }
            return res.json(response);
        }

        const idx1 = q.skipped.findIndex(i => i.toString() === appId);
        if (idx1 !== -1)
            return res.json({ appId, currentPatient: false, position: idx1 + 1, skippedPatient: true, found: true });

        return res.status(404).json({ error: "Appointment not found in queue", found: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getQrCode(req, res) {
    try {
        const appId = req.params.appId;
        const app = await Appointment.findById(appId);
        if (!app)
            return res.status(400).json({ msg: "Appointment not found", found: false });
        if (!app.qrCode)
            return res.json({ qrCode: false, found: false });
        res.json({ qrCode: true, qr: app.qrCode, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function addRecord(req, res) {
    try {
        const { pId, fileUrl } = req.body;
        const p = await Patient.findById(pId);
        if (!p)
            return res.status(404).json({ msg: "Patient not found", found: false });
        p.reports.push({ fileUrl });
        await p.save();
        res.json({ msg: "Record added successfully", fileUrl, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getTodayReports(req, res) {
    try {
        const pId = req.params.pId;
        const p = await Patient.findById(pId);
        if (!p)
            return res.status(404).json({ msg: "Patient not found", found: false });
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const reports = p.reports.filter(r => r.uploadedAt >= startOfDay && r.uploadedAt < endOfDay);
        res.json({ patientId: pId, todayReports: reports, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getReports(req, res) {
    try {
        const pId = req.params.pId;
        const p = await Patient.findById(pId);
        if (!p)
            return res.status(404).json({ msg: "Patient not found", found: false });
        res.json({ reports: p.reports, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getBookings(req, res) {
    try {
        const pId = req.params.pId;
        const app = await Appointment.find({ patientId: pId });
        if (app.length === 0)
            return res.json({ msg: "No appointments before", found: false });
        const app1 = app.map(a => ({ appointmentId: a._id, status: a.status }));
        res.json({ records: app1, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getPatientHistory(req, res) {
    try {
        const patientId = req.params.patientId;
        const history = await Appointment.find({ patientId })
            .populate("doctorId")
            .populate("departmentId", "name")
            .populate("paymentId", "amount status")
            .sort({ createdAt: -1 });
        if (!history || history.length === 0)
            return res.status(404).json({ msg: "No booking history found", found: false });
        res.status(200).json({ count: history.length, bookings: history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}




async function getLiveQueue(req, res) {
    try {
        const doctorId = req.params.doctorId;
        const today = new Date().toISOString().split("T")[0];
        const q = await Queue.findOne({ doctorId, date: today });
        if (!q)
            return res.status(404).json({ msg: "Today queue not found", found: false });

        const waitingCount = q.waiting.length;
        const skippedCount = q.skipped.length;

        
        const completedApps = await Appointment.find({
            doctorId, queueId: q._id, status: "COMPLETED",
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

        let estimatedWait = 0;
        if (waitingCount > 0) {
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

            estimatedWait = Math.round(baseRemainingTime + (waitingCount - 1) * avgConsultTime);
        }

        res.status(200).json({
            queueId: q._id,
            currentPatient: q.currentPatient,
            waitingCount, skippedCount,
            avgConsultTime,
            estimatedWaitMinutes: estimatedWait,
            estimatedWait: estimatedWait + " minutes",
            queueStatus: q.status,
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function rejoinQueue(req, res) {
    try {
        const mongoose = require("mongoose");
        const appId = new mongoose.Types.ObjectId(req.params.appointmentId);
        const today = new Date().toISOString().split("T")[0];

        const q = await Queue.findOne({ skipped: appId, date: today });
        if (!q)
            return res.status(404).json({ msg: "Appointment not found in skipped queue", found: false });

        const idx = q.skipped.findIndex(i => i.toString() === appId.toString());
        if (idx === -1)
            return res.status(400).json({ msg: "Appointment not in skipped queue", found: false });

        const [removed] = q.skipped.splice(idx, 1);
        const app = await Appointment.findById(appId);
        if (!app)
            return res.status(404).json({ msg: "Appointment not found", found: false });

        
        q.waiting.unshift(removed);
        app.status = "WAITING";
        await app.save();

        
        if (!q.currentPatient) {
            q.waitingSince = new Date();
        }
        await q.save();
        await updateQueueExpectedTimes(q._id);

        res.status(200).json({
            msg: "Patient rejoined queue at top",
            position: 1,
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function nextPatient(req, res) {
    try {
        const queueId = req.params.queueId;
        const q = await Queue.findById(queueId);
        if (!q) return res.status(404).json({ msg: "Queue not found", found: false });
        if (q.waiting.length === 0)
            return res.status(400).json({ msg: "No patients in waiting queue", found: false });

        const nextAppId = q.waiting.shift();
        q.currentPatient = nextAppId;
        q.waitingSince = null;

        const doctor = await Doctor.findById(q.doctorId);
        if (doctor) {
            doctor.status = "inroom";
            await doctor.save();
        }

        const c = await Appointment.findById(nextAppId);
        if (c) {
            c.status = "IN_ROOM";
            c.startedAt = new Date();
            await c.save();
        }
        await q.save();
        await updateQueueExpectedTimes(q._id);

        res.status(200).json({
            msg: "Moved to next patient",
            appointmentId: nextAppId,
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function skipAppointment(req, res) {
    try {
        const mongoose = require("mongoose");
        const appId = new mongoose.Types.ObjectId(req.params.appointmentId);
        const q = await Queue.findOne({ waiting: appId });
        if (!q)
            return res.status(404).json({ msg: "Appointment not found in waiting queue", found: false });

        const idx = q.waiting.findIndex(id => id.toString() === appId.toString());
        if (idx === -1)
            return res.status(400).json({ msg: "Appointment not in waiting queue", found: false });

        const [removed] = q.waiting.splice(idx, 1);
        q.skipped.push(removed);

        const a = await Appointment.findById(removed);
        if (a) {
            a.status = "SKIPPED";
            await a.save();

            
            const patient = await Patient.findById(a.patientId);
            if (patient && patient.email) {
                const doctor = await Doctor.findById(q.doctorId);
                const doctorName = doctor?.name || "your doctor";
                const html = buildSkippedEmail(patient.name, doctorName);
                await sendEmail(
                    patient.email,
                    `🏥 SmartCareQ: You Have Been Skipped`,
                    html
                );
            }
        }
        await q.save();
        await updateQueueExpectedTimes(q._id);

        res.status(200).json({
            msg: "Appointment skipped",
            appointmentId: removed,
            skippedPosition: q.skipped.length,
            found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAppointmentsByPatient(req, res) {
    try {
        const patientId = req.user.id;
        const appointments = await Appointment.find({ patientId }).sort({ bookedAt: 1 });
        if (appointments.length === 0)
            return res.status(404).json({ msg: "No appointments found", found: false });
        res.status(200).json({ appointments, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAppointment(req, res) {
    try {
        const appId = req.params.appointmentId;
        const appointment = await Appointment.findById(appId)
            .populate("patientId", "name phone")
            .populate("doctorId", "name");
        if (!appointment)
            return res.status(404).json({ msg: "Appointment not found", found: false });
        res.status(200).json({ appointment, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAppointmentQR(req, res) {
    try {
        const appId = req.params.appointmentId;
        const appointment = await Appointment.findById(appId);
        if (!appointment)
            return res.status(404).json({ msg: "Appointment not found", found: false });
        const qrData = await QRCode.toDataURL(JSON.stringify({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            bookedAt: appointment.bookedAt
        }));
        res.status(200).json({ appointmentId: appId, qr: qrData, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function requestSkipPermission(req, res) {
    try {
        const { appointmentId, staffApproved } = req.body;
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment)
            return res.status(404).json({ msg: "Appointment not found", found: false });

        if (!appointment.startedAt)
            return res.status(400).json({ msg: "Appointment has not been started yet", found: false });

        const elapsedMinutes = (new Date() - appointment.startedAt) / 60000;

        if (elapsedMinutes < 2) {
            return res.status(200).json({
                msg: "Less than 2 minutes elapsed",
                needsPermission: false,
                minutesElapsed: Math.floor(elapsedMinutes),
                minutesRemaining: Math.ceil(2 - elapsedMinutes),
                found: true
            });
        }

        if (!staffApproved) {
            return res.status(200).json({
                msg: "Staff permission required to skip patient",
                needsPermission: true,
                minutesElapsed: Math.floor(elapsedMinutes),
                found: true
            });
        }

        const queue = await Queue.findOne({ waiting: appointmentId });
        if (!queue)
            return res.status(404).json({ msg: "Appointment not found in waiting queue", found: false });

        const idx = queue.waiting.findIndex(id => id.toString() === appointmentId.toString());
        if (idx === -1)
            return res.status(400).json({ msg: "Appointment not in waiting queue", found: false });

        const [removed] = queue.waiting.splice(idx, 1);
        queue.skipped.push(removed);
        queue.currentPatient = null;
        appointment.status = "SKIPPED";
        await appointment.save();
        await queue.save();

        
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

        return res.status(200).json({
            msg: "Appointment skipped with staff approval",
            appointmentId, found: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    registerPatient, getPatientById, getPatients, deletePatient,
    bookAppointment, removeAppointment, updatePatient,
    getPosition, getQrCode, getTodayReports, getReports,
    addRecord, getBookings, getPatientHistory,
    getLiveQueue, rejoinQueue, nextPatient, skipAppointment,
    requestSkipPermission, getAppointmentsByPatient, validateBooking,
    getAppointment, getAppointmentQR
};
