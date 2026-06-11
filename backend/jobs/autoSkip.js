const Queue = require("../models/Queue");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { sendEmail, buildSkippedEmail, buildPositionOneEmail } = require("../utils/emailService");

const NO_SHOW_TIMEOUT_SECONDS = 120; // 2 minutes
const CHECK_INTERVAL_MS = 10000;     // Check every 10 seconds

async function autoSkipExpiredPatients() {
    try {
        const today = new Date().toISOString().split("T")[0];

        // Find all open queues that have a waitingSince timer running
        const queues = await Queue.find({
            date: today,
            status: { $in: ["OPEN"] },
            waitingSince: { $ne: null },
            currentPatient: null  // No one is in room, waiting for scan
        });

        for (const queue of queues) {
            if (queue.waiting.length === 0) {
                // No one to skip, clear stale timer
                queue.waitingSince = null;
                await queue.save();
                continue;
            }

            const elapsed = Math.floor((Date.now() - new Date(queue.waitingSince).getTime()) / 1000);

            if (elapsed >= NO_SHOW_TIMEOUT_SECONDS) {
                // Auto-skip the first patient
                const skippedAppId = queue.waiting.shift();
                queue.skipped.push(skippedAppId);

                const appointment = await Appointment.findById(skippedAppId);
                if (appointment) {
                    appointment.status = "SKIPPED";
                    await appointment.save();

                    // Notify skipped patient
                    const skippedPatient = await Patient.findById(appointment.patientId);
                    if (skippedPatient) {
                        if (skippedPatient.email) {
                            const doctor = await Doctor.findById(queue.doctorId);
                            const doctorName = doctor?.name || "your doctor";
                            const html = buildSkippedEmail(skippedPatient.name, doctorName);
                            await sendEmail(
                                skippedPatient.email,
                                `🏥 SmartCareQ: You Have Been Skipped`,
                                html
                            );
                        }
                    }
                }

                console.log(`⏭️ Auto-skipped patient (Appointment: ${skippedAppId}) from Queue: ${queue._id}`);

                // Start timer for next patient if available
                if (queue.waiting.length > 0) {
                    queue.waitingSince = new Date();

                    // Notify the new next patient
                    const nextAppId = queue.waiting[0];
                    const nextApp = await Appointment.findById(nextAppId);
                    if (nextApp) {
                        const nextPatient = await Patient.findById(nextApp.patientId);
                        if (nextPatient) {
                            if (nextPatient.email) {
                                const doctor = await Doctor.findById(queue.doctorId);
                                const doctorName = doctor?.name || "your doctor";
                                const html = buildPositionOneEmail(nextPatient.name, doctorName, nextApp.tokenNumber);
                                await sendEmail(
                                    nextPatient.email,
                                    `🏥 SmartCareQ: You're Next in Queue! Token #${nextApp.tokenNumber}`,
                                    html
                                );
                            }
                        }
                    }
                } else {
                    queue.waitingSince = null;
                }

                await queue.save();
            }
        }
    } catch (err) {
        console.error("❌ Auto-skip job error:", err.message);
    }
}

function startAutoSkipJob() {
    console.log(`⏱️ Auto-skip job started (checking every ${CHECK_INTERVAL_MS / 1000}s, timeout: ${NO_SHOW_TIMEOUT_SECONDS}s)`);
    setInterval(autoSkipExpiredPatients, CHECK_INTERVAL_MS);
}

module.exports = { startAutoSkipJob };
