const Appointment = require("../models/Appointment");
const Payment = require("../models/Payment");
const Queue = require("../models/Queue");
const Doctor = require("../models/Doctor");
const Department = require("../models/Department");

async function getAnalytics(req, res) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // ── 1. Today's Stats ────────────────────────────────────────────
        const todayAppointments = await Appointment.find({
            bookedAt: { $gte: today, $lt: tomorrow }
        });

        const todayTotal = todayAppointments.length;
        const todayCompleted = todayAppointments.filter(a => a.status === "COMPLETED").length;
        const todayWaiting = todayAppointments.filter(a => a.status === "WAITING").length;
        const todayCancelled = todayAppointments.filter(a => a.status === "CANCELLED").length;
        const todaySkipped = todayAppointments.filter(a => a.status === "SKIPPED").length;

        // ── 2. Average Wait Time (completed appointments today) ─────────
        let avgWaitMinutes = 0;
        const completedWithTimes = todayAppointments.filter(
            a => a.status === "COMPLETED" && a.startedAt && a.bookedAt
        );
        if (completedWithTimes.length > 0) {
            const totalWaitMs = completedWithTimes.reduce((sum, a) => {
                return sum + (new Date(a.startedAt) - new Date(a.bookedAt));
            }, 0);
            avgWaitMinutes = Math.round(totalWaitMs / completedWithTimes.length / 60000);
        }

        // ── 3. Average Consultation Time ────────────────────────────────
        let avgConsultMinutes = 0;
        const completedWithConsult = todayAppointments.filter(
            a => a.status === "COMPLETED" && a.startedAt && a.completedAt
        );
        if (completedWithConsult.length > 0) {
            const totalConsultMs = completedWithConsult.reduce((sum, a) => {
                return sum + (new Date(a.completedAt) - new Date(a.startedAt));
            }, 0);
            avgConsultMinutes = Math.round(totalConsultMs / completedWithConsult.length / 60000);
        }

        // ── 4. Department-wise Traffic ──────────────────────────────────
        const departments = await Department.find();
        const deptTraffic = [];
        for (const dept of departments) {
            const count = await Appointment.countDocuments({
                departmentId: dept._id,
                bookedAt: { $gte: today, $lt: tomorrow }
            });
            deptTraffic.push({ name: dept.name, id: dept._id, count });
        }

        // ── 5. 7-Day Revenue Trend ──────────────────────────────────────
        const revenueTrend = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(today);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayPayments = await Payment.find({
                createdAt: { $gte: dayStart, $lt: dayEnd },
                status: "PAID"
            });
            const totalRevenue = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            revenueTrend.push({
                date: dayStart.toISOString().split("T")[0],
                label: dayStart.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
                revenue: totalRevenue,
                count: dayPayments.length
            });
        }

        // ── 6. 7-Day Patient Traffic Trend ──────────────────────────────
        const trafficTrend = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(today);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = await Appointment.countDocuments({
                bookedAt: { $gte: dayStart, $lt: dayEnd }
            });
            trafficTrend.push({
                date: dayStart.toISOString().split("T")[0],
                label: dayStart.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
                count
            });
        }

        // ── 7. Doctor Performance (today) ───────────────────────────────
        const doctors = await Doctor.find().select("name status departmentId");
        const doctorPerformance = [];
        for (const doc of doctors) {
            const docApps = todayAppointments.filter(
                a => a.doctorId.toString() === doc._id.toString()
            );
            const completed = docApps.filter(a => a.status === "COMPLETED").length;
            const waiting = docApps.filter(a => a.status === "WAITING").length;
            const total = docApps.length;

            if (total > 0) {
                doctorPerformance.push({
                    name: doc.name,
                    status: doc.status,
                    completed,
                    waiting,
                    total
                });
            }
        }

        // ── 8. Today's Revenue ──────────────────────────────────────────
        const todayPayments = await Payment.find({
            createdAt: { $gte: today, $lt: tomorrow },
            status: "PAID"
        });
        const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // ── 9. Total all-time stats ─────────────────────────────────────
        const totalAllTime = await Appointment.countDocuments();
        const totalCompleted = await Appointment.countDocuments({ status: "COMPLETED" });

        res.json({
            today: {
                total: todayTotal,
                completed: todayCompleted,
                waiting: todayWaiting,
                cancelled: todayCancelled,
                skipped: todaySkipped,
                revenue: todayRevenue,
                avgWaitMinutes,
                avgConsultMinutes
            },
            allTime: {
                totalAppointments: totalAllTime,
                totalCompleted
            },
            deptTraffic,
            revenueTrend,
            trafficTrend,
            doctorPerformance
        });
    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getAnalytics };
