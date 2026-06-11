/**
 * SmartCareQueue — Full Feature Test (Phases 1-4)
 * Tests: Prescriptions, Analytics, Razorpay IDs, Cancel Queue + Refunds, Live Display
 */

const http = require("http");
const BASE = "http://localhost:3000";

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname, port: url.port,
            path: url.pathname + url.search, method,
            headers: { "Content-Type": "application/json", ...headers }
        };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed; try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

let passed = 0, failed = 0;
function assert(condition, label) {
    if (condition) { passed++; console.log(`   ✅ ${label}`); }
    else { failed++; console.log(`   ❌ FAIL: ${label}`); }
}

async function runTests() {
    try {
        console.log("═".repeat(60));
        console.log("  🧪 SmartCareQueue — Full Feature Test Suite");
        console.log("═".repeat(60));

        // ── LOGIN ALL ROLES ──────────────────────────────────────────
        console.log("\n📋 TEST 0: Login all roles");

        // Patient login
        let res = await request("POST", "/auth/login/Patient", {
            email: "ravi@gmail.com", password: "patient123"
        });
        assert(res.status === 200, "Patient login successful");
        const patientToken = res.data.accessToken;
        const patH = { Authorization: `Bearer ${patientToken}` };
        const patPayload = JSON.parse(Buffer.from(patientToken.split('.')[1], 'base64').toString());
        const patientId = patPayload.id;

        // Staff login
        res = await request("POST", "/auth/login/Staff", {
            staffId: "SCQ001", password: "staff123"
        });
        assert(res.status === 200, "Staff login successful");
        const staffH = { Authorization: `Bearer ${res.data.accessToken}` };

        // Doctor login
        res = await request("POST", "/auth/login/Doctor", {
            doctorId: "DOC001", password: "doctor123"
        });
        assert(res.status === 200, "Doctor login successful");
        const docH = { Authorization: `Bearer ${res.data.accessToken}` };

        // Admin login
        res = await request("POST", "/auth/login/Admin", {
            email: "admin@smartcareq.com", password: "admin123"
        });
        assert(res.status === 200, "Admin login successful");
        const adminH = { Authorization: `Bearer ${res.data.accessToken}` };

        // Get doctor ID and queue
        res = await request("GET", "/api/doctor/doctors");
        const doc1 = res.data.doctors.find(d => d.id === "DOC001");
        assert(!!doc1, "Found DOC001");

        res = await request("GET", `/api/patients/getQueuesByDId/${doc1._id}`);
        const queueId = res.data.queueId;
        assert(!!queueId, `Queue found: ${queueId}`);

        // ═══════════════════════════════════════════════════════════════
        // TEST 1: LIVE DISPLAY (Phase 2)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 1: Live TV Display endpoint");
        res = await request("GET", "/api/patients/live-display");
        assert(res.status === 200, "Live display returns 200");
        assert(Array.isArray(res.data.queues), "Live display returns queues array");
        if (res.data.queues.length > 0) {
            assert(res.data.queues[0].doctorId !== undefined, "Each queue has doctorId");
            console.log(`   📺 ${res.data.queues.length} queue(s) on display`);
        }

        // ═══════════════════════════════════════════════════════════════
        // TEST 2: EMERGENCY OVERRIDE (Phase 1)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 2: Emergency Override");

        // Get queue status to find a waiting patient
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patH);
        assert(res.data.found === true, "Queue status fetched");
        const waitingCount = res.data.waitingCount || 0;
        console.log(`   📊 Waiting count: ${waitingCount}`);

        if (waitingCount >= 2) {
            // Get queue details to find appointment IDs
            res = await request("GET", `/api/staff/getAssignedQueues`, null, staffH);
            let targetAppId = null;
            if (res.data && res.data.queues) {
                for (const q of res.data.queues) {
                    if (q.waiting && q.waiting.length >= 2) {
                        targetAppId = q.waiting[1]._id || q.waiting[1];
                        break;
                    }
                }
            }
            if (targetAppId) {
                res = await request("POST", "/api/staff/emergencyOverride", {
                    queueId, appointmentId: targetAppId
                }, staffH);
                assert(res.status === 200, `Emergency override: ${res.data.msg}`);
            } else {
                console.log("   ⚠️ Could not find target appointment for emergency override");
            }
        } else {
            console.log("   ⚠️ Not enough patients in queue for emergency override test");
        }

        // ═══════════════════════════════════════════════════════════════
        // TEST 3: STAFF SCAN + ADMIT (verify patient)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 3: Staff Scan & Admit");

        // Get the first waiting appointment
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patH);
        let firstAppId = null;
        if (res.data.queue && res.data.queue.waiting && res.data.queue.waiting.length > 0) {
            firstAppId = res.data.queue.waiting[0]._id || res.data.queue.waiting[0];
        }

        if (firstAppId) {
            res = await request("POST", "/api/staff/verifyAndAdmit", {
                queueId, appointmentId: firstAppId
            }, staffH);
            assert(res.status === 200, `Patient admitted: ${res.data.msg}`);
        } else {
            console.log("   ⚠️ No waiting patient to admit");
        }

        // ═══════════════════════════════════════════════════════════════
        // TEST 4: PRESCRIPTION + MARK COMPLETE (Phase 3)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 4: Digital Prescription + Mark Complete");

        res = await request("POST", "/api/doctor/markAsComplete", {
            queueId,
            prescriptionText: "Tab Paracetamol 500mg - 1 tablet 3 times daily after food for 5 days.\nTab Cetirizine 10mg - 1 tablet at bedtime for 3 days.",
            prescriptionUrl: "https://example.com/prescription/12345.pdf"
        }, docH);

        assert(res.status === 200, "Mark complete with prescription successful");
        assert(res.data.appointmentId !== undefined, `Appointment completed: ${res.data.appointmentId}`);
        console.log(`   💊 Completed count: ${res.data.completedCount}, Waiting: ${res.data.waitingCount}`);

        // Verify prescription saved by checking patient history
        const completedAppId = res.data.appointmentId;
        if (completedAppId) {
            res = await request("GET", `/api/doctor/appointmentDetail/${completedAppId}`, null, docH);
            if (res.status === 200 && res.data.appointment) {
                assert(res.data.appointment.prescriptionText !== "", "Prescription text saved");
                assert(res.data.appointment.prescriptionUrl !== "", "Prescription URL saved");
                assert(res.data.appointment.status === "COMPLETED", "Appointment status is COMPLETED");
            } else {
                console.log("   ⚠️ Could not verify prescription (appointment detail endpoint)");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // TEST 5: ADMIN ANALYTICS (Phase 3)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 5: Admin Analytics Dashboard");

        res = await request("GET", "/api/admin/analytics", null, adminH);
        assert(res.status === 200, "Analytics endpoint returns 200");
        assert(res.data.today !== undefined, "Has 'today' stats");
        assert(res.data.revenueTrend !== undefined, "Has revenue trend");
        assert(res.data.deptTraffic !== undefined, "Has department traffic");
        assert(res.data.trafficTrend !== undefined, "Has traffic trend");
        assert(res.data.doctorPerformance !== undefined, "Has doctor performance");
        assert(Array.isArray(res.data.revenueTrend) && res.data.revenueTrend.length === 7, "Revenue trend has 7 days");
        assert(Array.isArray(res.data.trafficTrend) && res.data.trafficTrend.length === 7, "Traffic trend has 7 days");

        console.log(`   📊 Today: ${res.data.today.total} patients, ${res.data.today.completed} completed, ₹${res.data.today.revenue} revenue`);
        console.log(`   ⏱️ Avg wait: ${res.data.today.avgWaitMinutes}m, Avg consult: ${res.data.today.avgConsultMinutes}m`);
        console.log(`   🏥 Departments: ${res.data.deptTraffic.map(d => `${d.name}(${d.count})`).join(", ")}`);
        console.log(`   👨‍⚕️ Doctors today: ${res.data.doctorPerformance.length}`);

        // ═══════════════════════════════════════════════════════════════
        // TEST 6: RAZORPAY PAYMENT IDs (Phase 4)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 6: Razorpay Payment ID Storage");

        res = await request("POST", "/api/patients/payment", {
            patientId,
            amount: 500,
            method: "ONLINE",
            razorpayPaymentId: "pay_TEST123456789",
            razorpayOrderId: "order_TEST987654321"
        }, patH);
        assert(res.status === 200, "Payment with Razorpay IDs created");
        assert(res.data.payment.razorpayPaymentId === "pay_TEST123456789", "razorpayPaymentId saved correctly");
        assert(res.data.payment.razorpayOrderId === "order_TEST987654321", "razorpayOrderId saved correctly");
        console.log(`   💳 Payment ID: ${res.data.payment._id}`);

        // ═══════════════════════════════════════════════════════════════
        // TEST 7: CANCEL QUEUE + AUTO-REFUND (Phase 4)
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 7: Cancel Queue with Auto-Refund");

        // Use DOC002's queue for cancel test (to not destroy DOC001's queue)
        res = await request("POST", "/auth/login/Doctor", {
            doctorId: "DOC002", password: "doctor123"
        });
        assert(res.status === 200, "DOC002 login successful");
        const doc2H = { Authorization: `Bearer ${res.data.accessToken}` };

        const doc2 = res.data.doctors ? res.data.doctors.find(d => d.id === "DOC002") : null;
        // Get DOC002's queue
        res = await request("GET", "/api/doctor/doctors");
        const doc2Info = res.data.doctors.find(d => d.id === "DOC002");

        if (doc2Info) {
            res = await request("GET", `/api/patients/getQueuesByDId/${doc2Info._id}`);
            if (res.data.found && res.data.queueId) {
                const doc2QueueId = res.data.queueId;
                console.log(`   📋 DOC002 Queue: ${doc2QueueId}`);

                // Check waiting count before cancel
                res = await request("GET", `/api/patients/getQueueStatus/${doc2QueueId}`, null, patH);
                const beforeWaiting = res.data.waitingCount || 0;
                console.log(`   ⏳ Waiting before cancel: ${beforeWaiting}`);

                // Cancel the queue
                res = await request("POST", "/api/doctor/cancelQueue", {
                    queueId: doc2QueueId
                }, doc2H);

                assert(res.status === 200, `Queue cancelled: ${res.data.msg}`);
                assert(res.data.cancelledCount !== undefined, `Cancelled ${res.data.cancelledCount} appointments`);
                assert(res.data.refundedCount !== undefined, `Refunded ${res.data.refundedCount} payments`);
                console.log(`   🚫 Cancelled: ${res.data.cancelledCount}, Refunded: ${res.data.refundedCount}`);

                if (res.data.refundResults && res.data.refundResults.length > 0) {
                    for (const r of res.data.refundResults) {
                        assert(r.status === "REFUNDED", `Payment refund status: ${r.status} (₹${r.amount})`);
                    }
                }

                // Verify queue is closed
                res = await request("GET", `/api/patients/getQueueStatus/${doc2QueueId}`, null, patH);
                if (res.data.found) {
                    assert(res.data.queue.status === "CLOSED", "Queue status is CLOSED after cancel");
                    assert(res.data.waitingCount === 0, "No patients waiting after cancel");
                }
            } else {
                console.log("   ⚠️ DOC002 has no active queue today");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // TEST 8: Patient Prescription View
        // ═══════════════════════════════════════════════════════════════
        console.log("\n📋 TEST 8: Patient views prescription in history");

        // Login as patient who was just completed (ravi)
        res = await request("GET", "/api/patients/getPatientById/me", null, patH);
        if (res.status === 200) {
            const myPatientId = res.data.p._id;
            res = await request("GET", `/api/patients/getPatientHistory/${myPatientId}`, null, patH);
            assert(res.status === 200, "Patient history fetched");
            if (res.data.bookings) {
                const completedBooking = res.data.bookings.find(b => b.status === "COMPLETED" && b.prescriptionText);
                if (completedBooking) {
                    assert(!!completedBooking.prescriptionText, "Prescription text visible in patient history");
                    assert(!!completedBooking.prescriptionUrl, "Prescription URL visible in patient history");
                    console.log(`   💊 Prescription: "${completedBooking.prescriptionText.substring(0, 50)}..."`);
                } else {
                    console.log("   ⚠️ No completed booking with prescription found for this patient");
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════════
        console.log("\n" + "═".repeat(60));
        console.log(`  🏁 TEST RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
        console.log("═".repeat(60));

        if (failed === 0) {
            console.log("  🎉 ALL TESTS PASSED!");
        } else {
            console.log(`  ⚠️ ${failed} test(s) failed — review above for details.`);
        }
        console.log("═".repeat(60));

    } catch (err) {
        console.error("\n❌ TEST SUITE ERROR:", err.message);
        console.error(err.stack);
    }
}

runTests();
