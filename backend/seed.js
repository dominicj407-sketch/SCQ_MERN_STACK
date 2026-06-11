/**
 * SmartCareQueue — Seed Script
 * Populates the database with realistic dummy data for all collections.
 *
 * Usage:  node seed.js
 *
 * ⚠️  This script DROPS all existing data before seeding.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
require("dotenv").config();

// ── Models ─────────────────────────────────────────────────────────────────
const Hospital = require("./models/hospital");
const Department = require("./models/Department");
const Admin = require("./models/Admin");
const Doctor = require("./models/Doctor");
const Staff = require("./models/staff");
const Patient = require("./models/Patient");
const Queue = require("./models/Queue");
const Payment = require("./models/Payment");
const Appointment = require("./models/Appointment");
const StaffAssignment = require("./models/StaffAssignment");
const QueueLog = require("./models/QueueLog");

// ── Helpers ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

async function hashPassword(plain) {
    return bcrypt.hash(plain, 10);
}

async function generateQR(data) {
    return QRCode.toDataURL(JSON.stringify(data));
}

// ── Main Seed Function ─────────────────────────────────────────────────────
async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartcarequeue");
        console.log("✅ Connected to MongoDB");

        // ── Drop all collections ───────────────────────────────────────────
        const collections = [
            Hospital, Department, Admin, Doctor, Staff,
            Patient, Queue, Payment, Appointment, StaffAssignment, QueueLog
        ];
        for (const Model of collections) {
            await Model.deleteMany({});
        }
        console.log("🗑️  Cleared all collections");

        // ════════════════════════════════════════════════════════════════════
        // 1. HOSPITAL
        // ════════════════════════════════════════════════════════════════════
        const hospital = await Hospital.create({
            name: "SmartCare General Hospital",
            address: "42 MG Road, Chennai, Tamil Nadu 600001",
            phone: "+914428520000"
        });
        console.log("🏥 Hospital created:", hospital.name);

        // ════════════════════════════════════════════════════════════════════
        // 2. DEPARTMENTS
        // ════════════════════════════════════════════════════════════════════
        const deptData = [
            { name: "General Medicine", hospitalId: hospital._id },
            { name: "Cardiology", hospitalId: hospital._id },
            { name: "Orthopedics", hospitalId: hospital._id },
            { name: "Dermatology", hospitalId: hospital._id }
        ];
        const departments = await Department.insertMany(deptData);
        console.log(`🏬 ${departments.length} departments created`);

        // ════════════════════════════════════════════════════════════════════
        // 3. ADMIN (password is now bcrypt-hashed)
        // ════════════════════════════════════════════════════════════════════
        const adminPassword = await hashPassword("admin123");
        const admin = await Admin.create({
            email: "admin@smartcareq.com",
            password: adminPassword
        });
        console.log("👑 Admin created:", admin.email, " | password: admin123");

        // ════════════════════════════════════════════════════════════════════
        // 4. DOCTORS — 4 available + 1 offline (default is now 'offline')
        // ════════════════════════════════════════════════════════════════════
        const docPassword = await hashPassword("doctor123");
        const doctorData = [
            {
                name: "Dr. Arun Kumar", id: "DOC001",
                phone: "+919876543210", email: "arun@smartcareq.com",
                password: docPassword, age: 42, gender: "male",
                hospitalId: hospital._id, departmentId: departments[0]._id,
                status: "available", dailyCapacity: 20
            },
            {
                name: "Dr. Priya Sharma", id: "DOC002",
                phone: "+919876543211", email: "priya@smartcareq.com",
                password: docPassword, age: 38, gender: "female",
                hospitalId: hospital._id, departmentId: departments[1]._id,
                status: "available", dailyCapacity: 15
            },
            {
                name: "Dr. Rajesh Menon", id: "DOC003",
                phone: "+919876543212", email: "rajesh@smartcareq.com",
                password: docPassword, age: 50, gender: "male",
                hospitalId: hospital._id, departmentId: departments[2]._id,
                status: "available", dailyCapacity: 18
            },
            {
                name: "Dr. Sneha Reddy", id: "DOC004",
                phone: "+919876543213", email: "sneha@smartcareq.com",
                password: docPassword, age: 35, gender: "female",
                hospitalId: hospital._id, departmentId: departments[3]._id,
                status: "available", dailyCapacity: 25
            },
            {
                name: "Dr. Vikram Singh", id: "DOC005",
                phone: "+919876543214", email: "vikram@smartcareq.com",
                password: docPassword, age: 45, gender: "male",
                hospitalId: hospital._id, departmentId: departments[0]._id,
                status: "offline", dailyCapacity: 12
            }
        ];
        const doctors = await Doctor.insertMany(doctorData);
        console.log(`👨‍⚕️ ${doctors.length} doctors created (4 available, 1 offline) | password: doctor123`);

        // ════════════════════════════════════════════════════════════════════
        // 5. STAFF (3 staff members)
        // ════════════════════════════════════════════════════════════════════
        const staffPassword = await hashPassword("staff123");
        const staffData = [
            {
                name: "Lakshmi Narayanan", staffId: "SCQ001",
                phone: "+919876543220", email: "lakshmi@smartcareq.com",
                password: staffPassword, age: 28, gender: "female",
                hospitalId: hospital._id, departmentId: departments[0]._id
            },
            {
                name: "Karthik Rajan", staffId: "SCQ002",
                phone: "+919876543221", email: "karthik@smartcareq.com",
                password: staffPassword, age: 32, gender: "male",
                hospitalId: hospital._id, departmentId: departments[1]._id
            },
            {
                name: "Divya Prakash", staffId: "SCQ003",
                phone: "+919876543222", email: "divya@smartcareq.com",
                password: staffPassword, age: 26, gender: "female",
                hospitalId: hospital._id, departmentId: departments[2]._id
            }
        ];
        const staffMembers = await Staff.insertMany(staffData);
        console.log(`👩‍💼 ${staffMembers.length} staff created | password: staff123`);

        // ════════════════════════════════════════════════════════════════════
        // 6. PATIENTS (6 patients)
        // ════════════════════════════════════════════════════════════════════
        const patientPassword = await hashPassword("patient123");
        const patientData = [
            {
                name: "Ravi Chandran", phone: "+919800000001",
                email: "ravi@gmail.com", password: patientPassword,
                age: 30, gender: "male"
            },
            {
                name: "Meena Kumari", phone: "+919800000002",
                email: "meena@gmail.com", password: patientPassword,
                age: 45, gender: "female"
            },
            {
                name: "Suresh Babu", phone: "+919800000003",
                email: "suresh@gmail.com", password: patientPassword,
                age: 60, gender: "male"
            },
            {
                name: "Anitha Devi", phone: "+919800000004",
                email: "anitha@gmail.com", password: patientPassword,
                age: 25, gender: "female"
            },
            {
                name: "Mohamed Irfan", phone: "+919800000005",
                email: "irfan@gmail.com", password: patientPassword,
                age: 35, gender: "male"
            },
            {
                name: "Kavitha Selvam", phone: "+919800000006",
                email: "kavitha@gmail.com", password: patientPassword,
                age: 50, gender: "female"
            }
        ];
        const patients = await Patient.insertMany(patientData);
        console.log(`🧑‍🤝‍🧑 ${patients.length} patients created | password: patient123`);

        // ════════════════════════════════════════════════════════════════════
        // 7. QUEUES (today's queues for first 4 doctors — who are available)
        // ════════════════════════════════════════════════════════════════════
        const queueData = [
            {
                hospitalId: hospital._id, departmentId: departments[0]._id,
                doctorId: doctors[0]._id, date: today, status: "OPEN",
                maxCapacity: 20, bookedAppointments: 0
            },
            {
                hospitalId: hospital._id, departmentId: departments[1]._id,
                doctorId: doctors[1]._id, date: today, status: "OPEN",
                maxCapacity: 15, bookedAppointments: 0
            },
            {
                hospitalId: hospital._id, departmentId: departments[2]._id,
                doctorId: doctors[2]._id, date: today, status: "OPEN",
                maxCapacity: 18, bookedAppointments: 0
            },
            {
                hospitalId: hospital._id, departmentId: departments[3]._id,
                doctorId: doctors[3]._id, date: today, status: "OPEN",
                maxCapacity: 25, bookedAppointments: 0
            }
        ];
        const queues = await Queue.insertMany(queueData);
        console.log(`📋 ${queues.length} queues created for today (${today})`);

        // ════════════════════════════════════════════════════════════════════
        // 8. PAYMENTS (one per patient)
        // ════════════════════════════════════════════════════════════════════
        const payments = [];
        for (const patient of patients) {
            const payment = await Payment.create({
                patientId: patient._id,
                amount: 100,
                method: "UPI",
                status: "PAID"
            });
            payments.push(payment);
        }
        console.log(`💰 ${payments.length} payments created`);

        // ════════════════════════════════════════════════════════════════════
        // 9. APPOINTMENTS (6 appointments spread across queues)
        // ════════════════════════════════════════════════════════════════════
        const appointmentConfigs = [
            { patientIdx: 0, doctorIdx: 0, queueIdx: 0, token: 1, status: "WAITING" },
            { patientIdx: 1, doctorIdx: 0, queueIdx: 0, token: 2, status: "WAITING" },
            { patientIdx: 2, doctorIdx: 0, queueIdx: 0, token: 3, status: "WAITING" },
            { patientIdx: 3, doctorIdx: 1, queueIdx: 1, token: 1, status: "WAITING" },
            { patientIdx: 4, doctorIdx: 2, queueIdx: 2, token: 1, status: "WAITING" },
            { patientIdx: 5, doctorIdx: 3, queueIdx: 3, token: 1, status: "WAITING" }
        ];

        const appointments = [];
        for (const cfg of appointmentConfigs) {
            const qrData = {
                appointmentId: null,
                patientId: patients[cfg.patientIdx]._id,
                doctorId: doctors[cfg.doctorIdx]._id,
                tokenNumber: cfg.token,
                date: today
            };

            const appointment = new Appointment({
                patientId: patients[cfg.patientIdx]._id,
                doctorId: doctors[cfg.doctorIdx]._id,
                departmentId: doctors[cfg.doctorIdx].departmentId,
                queueId: queues[cfg.queueIdx]._id,
                paymentId: payments[cfg.patientIdx]._id,
                tokenNumber: cfg.token,
                status: cfg.status
            });

            qrData.appointmentId = appointment._id;
            appointment.qrCode = await generateQR(qrData);
            await appointment.save();
            appointments.push(appointment);
        }
        console.log(`📅 ${appointments.length} appointments created with QR codes`);

        // ── Update queues with waiting lists (NO timer started — doctor must act) ──
        queues[0].waiting = [appointments[0]._id, appointments[1]._id, appointments[2]._id];
        queues[0].bookedAppointments = 3;
        // waitingSince NOT set — timer starts only when doctor views queue or marks complete
        await queues[0].save();

        queues[1].waiting = [appointments[3]._id];
        queues[1].bookedAppointments = 1;
        await queues[1].save();

        queues[2].waiting = [appointments[4]._id];
        queues[2].bookedAppointments = 1;
        await queues[2].save();

        queues[3].waiting = [appointments[5]._id];
        queues[3].bookedAppointments = 1;
        await queues[3].save();

        console.log("📋 Queues updated with waiting lists (timers NOT started — doctor controls)");

        // ════════════════════════════════════════════════════════════════════
        // 10. STAFF ASSIGNMENTS
        // ════════════════════════════════════════════════════════════════════
        const assignmentData = [
            {
                staffId: staffMembers[0]._id, doctorId: doctors[0]._id,
                queueId: queues[0]._id, assignedAt: today, active: true
            },
            {
                staffId: staffMembers[1]._id, doctorId: doctors[1]._id,
                queueId: queues[1]._id, assignedAt: today, active: true
            },
            {
                staffId: staffMembers[2]._id, doctorId: doctors[2]._id,
                queueId: queues[2]._id, assignedAt: today, active: true
            }
        ];
        const assignments = await StaffAssignment.insertMany(assignmentData);
        console.log(`🔗 ${assignments.length} staff assignments created`);

        // ════════════════════════════════════════════════════════════════════
        // 11. QUEUE LOGS
        // ════════════════════════════════════════════════════════════════════
        const logData = [
            {
                appointmentId: appointments[0]._id,
                action: "JOINED_QUEUE", fromStatus: "BOOKED", toStatus: "WAITING",
                role: "SYSTEM", reason: "Patient booked and joined queue"
            },
            {
                appointmentId: appointments[1]._id,
                action: "JOINED_QUEUE", fromStatus: "BOOKED", toStatus: "WAITING",
                role: "SYSTEM", reason: "Patient booked and joined queue"
            },
            {
                appointmentId: appointments[2]._id,
                action: "JOINED_QUEUE", fromStatus: "BOOKED", toStatus: "WAITING",
                role: "SYSTEM", reason: "Patient booked and joined queue"
            }
        ];
        const logs = await QueueLog.insertMany(logData);
        console.log(`📝 ${logs.length} queue log entries created`);

        // ════════════════════════════════════════════════════════════════════
        // SUMMARY
        // ════════════════════════════════════════════════════════════════════
        console.log("\n" + "═".repeat(60));
        console.log("  ✅ SEED COMPLETE — Summary");
        console.log("═".repeat(60));
        console.log(`  🏥 Hospital:      1  (${hospital.name})`);
        console.log(`  🏬 Departments:   ${departments.length}  (${departments.map(d => d.name).join(", ")})`);
        console.log(`  👑 Admin:         1  (${admin.email})`);
        console.log(`  👨‍⚕️ Doctors:       ${doctors.length}  (4 available, 1 offline)`);
        console.log(`  👩‍💼 Staff:         ${staffMembers.length}`);
        console.log(`  🧑 Patients:      ${patients.length}`);
        console.log(`  📋 Queues:        ${queues.length}  (today: ${today})`);
        console.log(`  💰 Payments:      ${payments.length}`);
        console.log(`  📅 Appointments:  ${appointments.length}`);
        console.log(`  🔗 Assignments:   ${assignments.length}`);
        console.log(`  📝 Queue Logs:    ${logs.length}`);
        console.log("═".repeat(60));
        console.log("\n  🔑 Login Credentials:");
        console.log("  ─────────────────────────────────────────");
        console.log("  Admin:    admin@smartcareq.com     / admin123");
        console.log("  Doctor:   DOC001–DOC005            / doctor123");
        console.log("  Staff:    SCQ001–SCQ003            / staff123");
        console.log("  Patient:  ravi@gmail.com (etc.)    / patient123");
        console.log("═".repeat(60));

    } catch (err) {
        console.error("❌ Seed error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

seed();
