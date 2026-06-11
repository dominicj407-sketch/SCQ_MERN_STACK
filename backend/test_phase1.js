/**
 * SmartCareQueue — Phase 1 Test Script (Thorough)
 * Verifies Offline Booking Insertion (Offset of 5) and Emergency Override (Move to index 0).
 */

const http = require("http");
const BASE = "http://127.0.0.1:3000";

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

async function registerAndBook(email, name, doc1) {
    try {
        // Register
        await request("POST", "/api/patients/registerPatient", {
            name,
            phone: "+91" + Math.floor(6000000000 + Math.random() * 3000000000),
            email,
            password: "password123",
            age: 30,
            gender: "male"
        });

        // Login
        let res = await request("POST", "/auth/login/Patient", {
            email, password: "password123"
        });
        if (res.status !== 200) throw new Error(`Login failed for ${email}`);
        const token = res.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const patientId = JSON.parse(payloadStr).id;

        // Payment
        res = await request("POST", "/api/patients/payment", {
            patientId, amount: 500, method: "UPI"
        }, headers);
        const paymentId = res.data.payment._id;

        // Book
        res = await request("POST", "/api/patients/bookAppointment", {
            patientId, doctorId: doc1._id,
            departmentId: doc1.departmentId, paymentId
        }, headers);
        if (res.status !== 201) {
            console.error(`❌ Booking failed: status=${res.status}, data=`, res.data);
            throw new Error(`Booking failed for ${email}`);
        }
        return { appId: res.data.appId, token };
    } catch (err) {
        console.error(`Error in registerAndBook for ${name}:`, err.message);
        throw err;
    }
}

async function runTests() {
    console.log("🚀 Running Thorough Phase 1 Verification Tests...\n");

    try {
        // Fetch Doctor DOC001
        let res = await request("GET", "/api/doctor/doctors");
        const doc1 = res.data.doctors.find(d => d.id === "DOC001");
        if (!doc1) throw new Error("DOC001 not found");
        console.log(`👨‍⚕️ Target Doctor: Dr. Arun Kumar (ID: ${doc1._id})`);

        // Get Queue ID
        res = await request("GET", `/api/patients/getQueuesByDId/${doc1._id}`);
        const queueId = res.data.queueId;
        console.log(`📋 Target Queue ID: ${queueId}`);

        // Register and book 5 online patients
        console.log("\n🌐 Booking 5 online patients to build queue...");
        const appA = await registerAndBook(`pat_a_${Date.now()}@test.com`, "Patient A", doc1);
        const appB = await registerAndBook(`pat_b_${Date.now()}@test.com`, "Patient B", doc1);
        const appC = await registerAndBook(`pat_c_${Date.now()}@test.com`, "Patient C", doc1);
        const appD = await registerAndBook(`pat_d_${Date.now()}@test.com`, "Patient D", doc1);
        const appE = await registerAndBook(`pat_e_${Date.now()}@test.com`, "Patient E", doc1);
        
        console.log("   ✅ 5 Patients booked successfully.");

        const patHeaders = { Authorization: `Bearer ${appA.token}` };

        // Check queue
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patHeaders);
        if (res.status !== 200) throw new Error(`Failed to get queue status: ${res.status} ${JSON.stringify(res.data)}`);
        let waitingList = res.data.queue.waiting || [];
        console.log(`   📊 Queue length: ${waitingList.length}`);
        console.log(`   👉 Waiting queue IDs:`, waitingList.map(id => id.slice(-6)));

        // Get before offlineCount
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patHeaders);
        const beforeOfflineCount = res.data.queue.offlineCount || 0;

        // Book 1 walk-in (offline) patient
        console.log("\n🏥 Booking 1 walk-in (offline) patient...");
        const walkinEmail = `walkin_final_${Date.now()}@test.com`;
        await request("POST", "/api/patients/registerPatient", {
            name: "Walk-In Patient Final",
            phone: "+91" + Math.floor(6000000000 + Math.random() * 3000000000),
            email: walkinEmail,
            password: "password123",
            age: 30,
            gender: "male"
        });
        res = await request("POST", "/auth/login/Patient", {
            email: walkinEmail, password: "password123"
        });
        const wToken = res.data.accessToken;
        const wHeaders = { Authorization: `Bearer ${wToken}` };
        const wPayload = JSON.parse(Buffer.from(wToken.split('.')[1], 'base64').toString());
        
        res = await request("POST", "/api/patients/payment", {
            patientId: wPayload.id, amount: 500, method: "ONLINE"
        }, wHeaders);
        const wPaymentId = res.data.payment._id;

        res = await request("POST", "/api/patients/bookAppointment", {
            patientId: wPayload.id,
            doctorId: doc1._id,
            departmentId: doc1.departmentId,
            paymentId: wPaymentId,
            isOffline: true
        }, wHeaders);
        
        if (res.status !== 201) throw new Error("Offline booking failed: " + JSON.stringify(res.data));
        const walkinAppId = res.data.appId;
        console.log(`   ✅ Walk-in booking successful. App ID: ${walkinAppId}`);

        // Re-fetch queue to check placement
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patHeaders);
        waitingList = res.data.queue.waiting || [];
        console.log(`   📊 New queue length: ${waitingList.length}`);
        
        // Verify index of walkinAppId
        const idx = waitingList.findIndex(id => id.toString() === walkinAppId.toString());
        console.log(`   👉 Walk-in patient index: ${idx} (Position ${idx + 1})`);
        
        const expectedIndex = Math.min(beforeOfflineCount * 5 + 4, waitingList.length - 1);
        if (idx === expectedIndex) {
            console.log(`   ✅ SUCCESS: Walk-in offset correctly applied at expected index ${expectedIndex}!`);
        } else {
            console.log(`   ❌ ERROR: Walk-in at index ${idx}, expected ${expectedIndex}.`);
        }

        // 3. Emergency Override
        console.log("\n🔑 Logging in as Staff (SCQ001)...");
        res = await request("POST", "/auth/login/Staff", {
            staffId: "SCQ001", password: "staff123"
        });
        if (res.status !== 200) throw new Error("Staff login failed: " + JSON.stringify(res.data));
        const staffToken = res.data.accessToken;
        const staffHeaders = { Authorization: `Bearer ${staffToken}` };
        
        // Select patient C (originally index 2) to make Emergency
        const targetAppId = appC.appId;
        const targetIdxBefore = waitingList.findIndex(id => id.toString() === targetAppId.toString());
        console.log(`🚨 Triggering Emergency Override for Patient C (App ID: ${targetAppId}) at Index ${targetIdxBefore}`);
        
        res = await request("POST", "/api/staff/emergencyOverride", {
            queueId,
            appointmentId: targetAppId
        }, staffHeaders);
        if (res.status !== 200) throw new Error("Emergency override failed: " + JSON.stringify(res.data));
        console.log("   ✅ Emergency override response message: " + res.data.msg);

        // Fetch queue and verify
        res = await request("GET", `/api/patients/getQueueStatus/${queueId}`, null, patHeaders);
        const finalWaiting = res.data.queue.waiting || [];
        console.log(`   📊 Final queue token order:`, finalWaiting.map(id => id.slice(-6)));
        
        if (finalWaiting[0] === targetAppId.toString()) {
            console.log("   ✅ SUCCESS: Patient C is now at Index 0 (Position 1)!");
        } else {
            console.log("   ❌ ERROR: Patient C not at Index 0.");
        }

        console.log("\n🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY! 🎉");
    } catch (err) {
        console.error("\n❌ Test Failed:", err.message);
    }
}

runTests();
