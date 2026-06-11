/**
 * SmartCareQueue — Test Script (Post-Fix)
 * Verifies all fixes are working correctly.
 */

const http = require("http");
const BASE = "http://127.0.0.1:3000";
let passCount = 0, failCount = 0;
const issues = [];
const state = {};

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
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function getCookies(res) {
    const sc = res.headers["set-cookie"];
    return sc ? sc.map(c => c.split(";")[0]).join("; ") : "";
}
function pass(n, d = "") { passCount++; console.log(`  ✅ ${n}${d ? " — " + d : ""}`); }
function fail(n, d, logic = false) { failCount++; const t = logic ? "🔶 LOGIC" : "❌ ERROR"; console.log(`  ${t} ${n} — ${d}`); issues.push({ n, d, logic }); }

// ═══════════════════════════════════════════════════════════════════════════
async function testAuth() {
    console.log("\n══ 1. AUTHENTICATION (Fixed) ══════════════════════════════");

    // Patient login
    let res = await request("POST", "/auth/login/Patient", { email: "ravi@gmail.com", password: "patient123" });
    if (res.status === 200 && res.data.accessToken) { state.patientToken = res.data.accessToken; state.patientCookies = getCookies(res); pass("Patient login"); }
    else fail("Patient login", `${res.status}: ${JSON.stringify(res.data)}`);

    // Doctor login
    res = await request("POST", "/auth/login/Doctor", { doctorId: "DOC001", password: "doctor123" });
    if (res.status === 200) { state.doctorToken = res.data.accessToken; state.doctorCookies = getCookies(res); pass("Doctor login"); }
    else fail("Doctor login", `${res.status}: ${JSON.stringify(res.data)}`);

    // Staff login
    res = await request("POST", "/auth/login/Staff", { staffId: "SCQ001", password: "staff123" });
    if (res.status === 200) { state.staffToken = res.data.accessToken; state.staffCookies = getCookies(res); pass("Staff login"); }
    else fail("Staff login", `${res.status}: ${JSON.stringify(res.data)}`);

    // FIX E1: Admin login (was broken, now uses bcrypt)
    res = await request("POST", "/auth/login/Admin", { email: "admin@smartcareq.com", password: "admin123" });
    if (res.status === 200 && res.data.accessToken) { state.adminToken = res.data.accessToken; pass("Admin login (FIX E1)", "bcrypt.compare works"); }
    else fail("Admin login (FIX E1)", `STILL BROKEN: ${res.status}: ${JSON.stringify(res.data)}`);

    // Refresh
    res = await request("POST", "/auth/refresh/Patient", {}, { Cookie: state.patientCookies });
    if (res.status === 200) { state.patientToken = res.data.accessToken; pass("Token refresh"); }
    else fail("Token refresh", `${res.status}`);

    // No token → 401
    res = await request("GET", "/api/patients/getPatientById/x");
    if (res.status === 401) pass("Protected route rejects no-token");
    else fail("Protected route rejects no-token", `got ${res.status}`, true);
}

async function testPasswordLeakFix() {
    console.log("\n══ 2. PASSWORD LEAK FIX (L1) ══════════════════════════════");
    const patH = { Authorization: `Bearer ${state.patientToken}` };
    const adminH = { Authorization: `Bearer ${state.adminToken}` };

    // Patients
    let res = await request("GET", "/api/patients/getPatients", null, patH);
    if (res.status === 200) {
        if (res.data[0] && !res.data[0].password) pass("getPatients — no password in response");
        else fail("getPatients — password leak", "password field still present", true);
        state.patients = res.data;
    }

    // Doctors
    res = await request("GET", "/api/doctor/doctors");
    if (res.status === 200) {
        if (res.data.doctors[0] && !res.data.doctors[0].password) pass("getDoctors — no password in response");
        else fail("getDoctors — password leak", "password field still present", true);
        state.doctors = res.data.doctors;
    }

    // Staff
    res = await request("GET", "/api/admin/getStaffs", null, adminH);
    if (res.status === 200) {
        if (res.data.staffs[0] && !res.data.staffs[0].password) pass("getStaffs — no password in response");
        else fail("getStaffs — password leak", "password field still present", true);
    }
}

async function testAuthOnRoutes() {
    console.log("\n══ 3. AUTH ON PREVIOUSLY UNPROTECTED ROUTES (L3) ═════════");

    // Admin routes without token
    let res = await request("GET", "/api/admin/getDoctors");
    if (res.status === 401) pass("Admin getDoctors requires auth");
    else fail("Admin getDoctors still unprotected", `got ${res.status}`, true);

    // Admin routes with patient token (wrong role)
    res = await request("GET", "/api/admin/getDoctors", null, { Authorization: `Bearer ${state.patientToken}` });
    if (res.status === 403) pass("Admin route rejects Patient role (RBAC)");
    else fail("Admin route accepts Patient role", `got ${res.status}`, true);

    // Admin routes with admin token
    res = await request("GET", "/api/admin/getDoctors", null, { Authorization: `Bearer ${state.adminToken}` });
    if (res.status === 200) pass("Admin route works with Admin token");
    else fail("Admin route with Admin token", `got ${res.status}`);

    // Update patient without auth
    res = await request("POST", `/api/patients/updatePatients/${state.patients[0]._id}`, { name: "Hacker" });
    if (res.status === 401) pass("updatePatients requires auth");
    else fail("updatePatients still unprotected", `got ${res.status}`, true);

    // Payment without auth
    res = await request("POST", "/api/patients/payment", { patientId: state.patients[0]._id, amount: 100, method: "UPI" });
    if (res.status === 401) pass("payment requires auth");
    else fail("payment still unprotected", `got ${res.status}`, true);

    // Staff noShowStatus without auth
    const doctorObjId = state.doctors.find(d => d.id === "DOC001")._id;
    const qRes = await request("GET", `/api/patients/getQueuesByDId/${doctorObjId}`);
    state.queueId = qRes.data.queueId;
    res = await request("GET", `/api/staff/noShowStatus/${state.queueId}`);
    if (res.status === 401) pass("noShowStatus requires auth");
    else fail("noShowStatus still unprotected", `got ${res.status}`, true);

    // Staff pauseQueue without auth
    res = await request("GET", `/api/staff/pauseQueue/${state.queueId}`);
    if (res.status === 401) pass("staff pauseQueue requires auth");
    else fail("staff pauseQueue still unprotected", `got ${res.status}`, true);

    // Bookings without auth
    res = await request("GET", `/api/patients/getBookings/${state.patients[0]._id}`);
    if (res.status === 401) pass("getBookings requires auth");
    else fail("getBookings still unprotected", `got ${res.status}`, true);

    // Cancel without auth
    res = await request("POST", `/api/patients/removeAppointment/000000000000000000000000`);
    if (res.status === 401) pass("removeAppointment requires auth");
    else fail("removeAppointment still unprotected", `got ${res.status}`, true);
}

async function testDoctorStatusAndBooking() {
    console.log("\n══ 4. DOCTOR STATUS & BOOKING RESTRICTIONS (NEW) ═════════");
    const patH = { Authorization: `Bearer ${state.patientToken}` };
    const docH = { Authorization: `Bearer ${state.doctorToken}` };

    // Check DOC005 is offline
    let res = await request("GET", "/api/doctor/getStatusCapacity/DOC005");
    if (res.status === 200 && res.data.status === "offline") pass("DOC005 default status = offline");
    else fail("DOC005 default status", `expected offline, got ${res.data?.status}`, true);

    // Try booking for offline DOC005
    const doc5 = state.doctors.find(d => d.id === "DOC005");
    res = await request("POST", "/api/patients/validateBooking", {
        patientId: state.patients[4]._id,
        doctorId: doc5._id
    }, patH);
    if (res.status === 400 && res.data.msg.includes("offline")) pass("Cannot book offline doctor", res.data.msg);
    else fail("Booking offline doctor", `expected 400, got ${res.status}: ${JSON.stringify(res.data)}`, true);

    // Booking for available DOC001 should work (but duplicate check may block)
    const doc1 = state.doctors.find(d => d.id === "DOC001");

    // Use a patient without existing appointment (patient index 4 = irfan)
    res = await request("POST", "/api/patients/validateBooking", {
        patientId: state.patients[4]._id,
        doctorId: doc1._id
    }, patH);
    if (res.status === 200 && res.data.valid) pass("Can validate booking for available doctor", `slotsRemaining=${res.data.slotsRemaining}`);
    else if (res.status === 409) pass("Validate booking — duplicate blocked (patient has active appointment)");
    else fail("Validate booking for available doctor", `${res.status}: ${JSON.stringify(res.data)}`);

    // Test capacity: Check the slots info
    res = await request("GET", `/api/patients/getQueuesByDId/${doc1._id}`);
    if (res.status === 200) {
        pass("Queue slots info", `booked=${res.data.booked}, limit=${res.data.limit}`);
    }
}

async function testQueueFlow() {
    console.log("\n══ 5. QUEUE FLOW (Admit → Complete → Skip) ═══════════════");
    const staffH = { Authorization: `Bearer ${state.staffToken}` };
    const docH = { Authorization: `Bearer ${state.doctorToken}` };

    // Get queue status
    let res = await request("GET", `/api/patients/getQueueStatus/${state.queueId}`, null, { Authorization: `Bearer ${state.patientToken}` });
    if (res.status === 200) {
        pass("Queue status", `waiting=${res.data.waitingCount}, status=${res.data.queue.status}`);
        state.waitingApps = res.data.queue.waiting;
    } else { fail("Queue status", `${res.status}`); return; }

    if (state.waitingApps.length === 0) {
        console.log("  ⚠️  No waiting patients — skipping flow tests");
        return;
    }

    const firstApp = state.waitingApps[0];

    // Admit first patient
    res = await request("POST", "/api/staff/verifyAndAdmit", { queueId: state.queueId, appointmentId: firstApp }, staffH);
    if (res.status === 200 && res.data.admitted) pass("Admit patient", `name=${res.data.patientName}`);
    else if (res.status === 200 && res.data.rejoined) pass("Patient rejoined");
    else { fail("Admit patient", `${res.status}: ${JSON.stringify(res.data)}`); return; }

    // FIX L2: Try admitting a second patient while room occupied
    if (state.waitingApps.length > 1) {
        res = await request("POST", "/api/staff/verifyAndAdmit", { queueId: state.queueId, appointmentId: state.waitingApps[1] }, staffH);
        if (res.status === 409 || res.status === 400) pass("Room occupied — correctly blocked (FIX L2)");
        else fail("Room occupied check (FIX L2)", `expected 409, got ${res.status}: ${JSON.stringify(res.data)}`, true);
    }

    // Mark complete
    res = await request("POST", "/api/doctor/markAsComplete", { queueId: state.queueId }, docH);
    if (res.status === 200 && res.data.found) pass("Mark complete", `completed=${res.data.completedCount}`);
    else fail("Mark complete", `${res.status}`);

    // Mark complete with no patient
    res = await request("POST", "/api/doctor/markAsComplete", { queueId: state.queueId }, docH);
    if (res.status === 400) pass("Mark complete — no patient rejection");
    else fail("Mark complete — no patient", `expected 400, got ${res.status}`, true);

    // Skip next waiting
    res = await request("POST", "/api/staff/skipCurrentWaiting", { queueId: state.queueId }, staffH);
    if (res.status === 200) { state.skippedAppId = res.data.skippedAppointmentId; pass("Skip waiting patient"); }
    else if (res.status === 400) pass("Skip — no patients (queue empty)");
    else fail("Skip", `${res.status}`);

    // Pause
    res = await request("GET", `/api/doctor/pauseQueue/${state.queueId}`, null, docH);
    if (res.status === 200) pass("Pause queue");
    else fail("Pause queue", `${res.status}`);

    // Check paused
    res = await request("GET", `/api/patients/getQueueStatus/${state.queueId}`, null, { Authorization: `Bearer ${state.patientToken}` });
    if (res.status === 200 && res.data.queue.status === "PAUSED") {
        pass("Queue is PAUSED");
        if (res.data.queue.waitingSince === null) pass("Timer cleared on pause");
        else fail("Timer not cleared on pause", `waitingSince=${res.data.queue.waitingSince}`, true);
    }

    // Resume
    res = await request("GET", `/api/doctor/resumeQueue/${state.queueId}`, null, docH);
    if (res.status === 200) pass("Resume queue");
    else fail("Resume queue", `${res.status}`);

    // Doctor status → break
    const doc1 = state.doctors.find(d => d.id === "DOC001");
    res = await request("PUT", `/api/doctor/updateStatus/${doc1._id}`, { id: doc1._id, status: "break" }, docH);
    if (res.status === 200) pass("Doctor → break", `queueStatus=${res.data.queueStatus}`);
    else fail("Doctor → break", `${res.status}`);

    // Doctor status → available
    res = await request("PUT", `/api/doctor/updateStatus/${doc1._id}`, { id: doc1._id, status: "available" }, docH);
    if (res.status === 200) pass("Doctor → available", `queueStatus=${res.data.queueStatus}`);
    else fail("Doctor → available", `${res.status}`);
}

async function testBookingFlow() {
    console.log("\n══ 6. FULL BOOKING FLOW ═══════════════════════════════════");
    const patH = { Authorization: `Bearer ${state.patientToken}` };

    // Register new patient
    let res = await request("POST", "/api/patients/registerPatient", {
        name: "Test Post Fix", phone: "+919111111111",
        email: "testpostfix@test.com", password: "test123",
        age: 28, gender: "male"
    });
    if (res.status === 200 && res.data.found) { state.newPId = res.data.patientId; pass("Register new patient"); }
    else fail("Register new patient", `${res.status}`);

    // Login
    res = await request("POST", "/auth/login/Patient", { email: "testpostfix@test.com", password: "test123" });
    if (res.status === 200) { state.newPToken = res.data.accessToken; pass("Login new patient"); }
    else fail("Login new patient", `${res.status}`);

    const newPH = { Authorization: `Bearer ${state.newPToken}` };

    // Payment
    res = await request("POST", "/api/patients/payment", { patientId: state.newPId, amount: 100, method: "UPI" }, newPH);
    if (res.status === 200) { state.newPayId = res.data.payment._id; pass("Create payment"); }
    else fail("Create payment", `${res.status}`);

    // Book for available doctor
    const doc2 = state.doctors.find(d => d.id === "DOC002");
    res = await request("POST", "/api/patients/bookAppointment", {
        patientId: state.newPId, doctorId: doc2._id,
        departmentId: doc2.departmentId, paymentId: state.newPayId
    }, newPH);
    if (res.status === 201) { state.newAppId = res.data.appId; pass("Book appointment", `token=${res.data.tokenNumber}`); }
    else fail("Book appointment", `${res.status}: ${JSON.stringify(res.data)}`);

    // Duplicate booking
    res = await request("POST", "/api/patients/bookAppointment", {
        patientId: state.newPId, doctorId: doc2._id,
        departmentId: doc2.departmentId, paymentId: state.newPayId
    }, newPH);
    if (res.status === 409) pass("Duplicate booking blocked");
    else fail("Duplicate booking not blocked", `${res.status}`, true);

    // Try booking for offline doctor
    const doc5 = state.doctors.find(d => d.id === "DOC005");
    // Need a new payment first
    res = await request("POST", "/api/patients/payment", { patientId: state.newPId, amount: 100, method: "UPI" }, newPH);
    const pay2 = res.data?.payment?._id;
    if (doc5 && pay2) {
        res = await request("POST", "/api/patients/bookAppointment", {
            patientId: state.newPId, doctorId: doc5._id,
            departmentId: doc5.departmentId, paymentId: pay2
        }, newPH);
        if (res.status === 400 && res.data.msg && res.data.msg.includes("offline")) pass("Book for offline doctor blocked", res.data.msg);
        else if (res.status === 409) pass("Book for offline — duplicate (already has active)");
        else fail("Book for offline doctor", `expected block, got ${res.status}: ${JSON.stringify(res.data)}`, true);
    }

    // Cancel
    if (state.newAppId) {
        res = await request("POST", `/api/patients/removeAppointment/${state.newAppId}`, null, newPH);
        if (res.status === 200) pass("Cancel appointment");
        else fail("Cancel", `${res.status}`);
    }
}

async function testPayment() {
    console.log("\n══ 7. PAYMENT ═════════════════════════════════════════════");
    const patH = { Authorization: `Bearer ${state.patientToken}` };

    let res = await request("POST", "/api/patients/create-order", {}, patH);
    if (res.status === 200 && res.data.id) pass("Razorpay order created");
    else fail("Razorpay order", `${res.status} — may need valid keys`);

    res = await request("GET", `/api/patients/getpaymentById/000000000000000000000000`, null, patH);
    if (res.status === 404) pass("Get non-existent payment — 404");
    else fail("Get payment", `${res.status}`);
}

async function testReports() {
    console.log("\n══ 8. REPORTS & HISTORY ═══════════════════════════════════");
    const patH = { Authorization: `Bearer ${state.patientToken}` };

    let res = await request("GET", `/api/patients/getReports/${state.patients[0]._id}`, null, patH);
    if (res.status === 200) pass("Get reports");
    else fail("Get reports", `${res.status}`);

    res = await request("GET", `/api/patients/getReportsToday/${state.patients[0]._id}`, null, patH);
    if (res.status === 200) pass("Get today reports");
    else fail("Get today reports", `${res.status}`);

    res = await request("POST", "/api/patients/addRecord", { pId: state.patients[0]._id, fileUrl: "https://example.com/report.pdf" }, patH);
    if (res.status === 200) pass("Add record");
    else fail("Add record", `${res.status}`);

    res = await request("GET", `/api/patients/getPatientHistory/${state.patients[0]._id}`, null, patH);
    if (res.status === 200 || res.status === 404) pass("Get patient history");
    else fail("Get patient history", `${res.status}`);

    res = await request("GET", "/auth/logout");
    if (res.status === 200) pass("Logout");
    else fail("Logout", `${res.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════
async function run() {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  SmartCareQueue — Post-Fix Verification Tests           ║");
    console.log("╚══════════════════════════════════════════════════════════╝");

    try {
        await testAuth();
        await testPasswordLeakFix();
        await testAuthOnRoutes();
        await testDoctorStatusAndBooking();
        await testQueueFlow();
        await testBookingFlow();
        await testPayment();
        await testReports();
    } catch (e) {
        console.error("  💀 FATAL:", e.message);
    }

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  RESULTS                                                ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log(`  ✅ Passed: ${passCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    const logic = issues.filter(i => i.logic);
    const errs = issues.filter(i => !i.logic);
    if (logic.length) { console.log(`\n  🔶 LOGIC (${logic.length}):`); logic.forEach((i, x) => console.log(`     ${x + 1}. [${i.n}] ${i.d}`)); }
    if (errs.length) { console.log(`\n  ❌ ERRORS (${errs.length}):`); errs.forEach((i, x) => console.log(`     ${x + 1}. [${i.n}] ${i.d}`)); }
    if (failCount === 0) console.log("\n  🎉 ALL TESTS PASSED!");
    console.log("\n══════════════════════════════════════════════════════════");
}

run();
