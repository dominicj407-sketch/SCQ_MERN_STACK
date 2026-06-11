/**
 * SmartCareQueue — End-to-End Flow Test
 * Tests: register/login patient bskaithi1 -> book -> staff scan -> doctor complete
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
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runFlow() {
    try {
        console.log("🚀 Starting E2E Flow: bskaithi1 -> Book -> Scan -> Complete\n");

        // 1. Register Patient
        console.log("1. Registering patient 'bskaithi1'...");
        let res = await request("POST", "/api/patients/registerPatient", {
            name: "bskaithi1",
            phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000), // Random phone
            email: "bskaithi1@gmail.com",
            password: "password123",
            age: 25,
            gender: "male"
        });
        
        let patientId;
        if (res.status === 200 && res.data.found) {
            patientId = res.data.patientId;
            console.log(`   ✅ Registered successfully. Patient ID: ${patientId}`);
        } else if (res.status === 409) {
            console.log(`   ⚠️ Patient already exists. Proceeding to login.`);
            // Fetch patient list to get ID (not strictly needed since login returns it via token but let's just proceed)
        } else {
            throw new Error(`Registration failed: ${res.status} - ${JSON.stringify(res.data)}`);
        }

        // 2. Login Patient
        console.log("\n2. Logging in as 'bskaithi1'...");
        res = await request("POST", "/auth/login/Patient", {
            email: "bskaithi1@gmail.com", password: "patient123"
        });
        if (res.status !== 200) throw new Error(`Login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        
        const patientToken = res.data.accessToken;
        // Decode JWT payload (base64 string between dots)
        const payloadStr = Buffer.from(patientToken.split('.')[1], 'base64').toString();
        patientId = JSON.parse(payloadStr).id;
        
        const patH = { Authorization: `Bearer ${patientToken}` };
        console.log(`   ✅ Logged in successfully. Patient ID: ${patientId}`);

        // 3. Make Payment
        console.log("\n3. Making payment for appointment...");
        res = await request("POST", "/api/patients/payment", {
            patientId: patientId, amount: 100, method: "UPI"
        }, patH);
        if (res.status !== 200) throw new Error(`Payment failed: ${res.status} - ${JSON.stringify(res.data)}`);
        
        const paymentId = res.data.payment._id;
        console.log(`   ✅ Payment successful. Payment ID: ${paymentId}`);

        // 4. Get Available Doctor & Queue (Using DOC001)
        console.log("\n4. Fetching doctors to find DOC001...");
        res = await request("GET", "/api/doctor/doctors");
        const doc1 = res.data.doctors.find(d => d.id === "DOC001");
        if (!doc1) throw new Error("DOC001 not found");
        console.log(`   ✅ Found Doctor: ${doc1.name}`);

        // 5. Book Appointment
        console.log("\n5. Booking appointment...");
        res = await request("POST", "/api/patients/bookAppointment", {
            patientId: patientId, doctorId: doc1._id,
            departmentId: doc1.departmentId, paymentId: paymentId
        }, patH);
        
        if (res.status !== 201) throw new Error(`Booking failed: ${res.status} - ${JSON.stringify(res.data)}`);
        
        const appId = res.data.appId;
        console.log(`   ✅ Booking successful. Appointment ID: ${appId}, Token Number: ${res.data.tokenNumber}`);

        // Get Queue ID for doc1
        res = await request("GET", `/api/patients/getQueuesByDId/${doc1._id}`);
        const queueId = res.data.queueId;
        console.log(`   ✅ Target Queue ID: ${queueId}`);

        // 6. Login as Staff (SCQ001 is assigned to DOC001)
        console.log("\n6. Logging in as Staff SCQ001...");
        res = await request("POST", "/auth/login/Staff", {
            staffId: "SCQ001", password: "staff123"
        });
        if (res.status !== 200) throw new Error(`Staff login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        
        const staffToken = res.data.accessToken;
        const staffH = { Authorization: `Bearer ${staffToken}` };
        console.log(`   ✅ Staff logged in successfully.`);

        // 7. Staff Scan (Verify & Admit)
        console.log("\n7. Staff scanning patient QR (Admit to Room)...");
        res = await request("POST", "/api/staff/verifyAndAdmit", {
            queueId: queueId,
            appointmentId: appId
        }, staffH);
        
        if (res.status !== 200) throw new Error(`Staff admit failed: ${res.status} - ${JSON.stringify(res.data)}`);
        console.log(`   ✅ Patient admitted! Response: ${JSON.stringify(res.data)}`);

        // 8. Login as Doctor (DOC001)
        console.log("\n8. Logging in as Doctor DOC001...");
        res = await request("POST", "/auth/login/Doctor", {
            doctorId: "DOC001", password: "doctor123"
        });
        if (res.status !== 200) throw new Error(`Doctor login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        
        const docToken = res.data.accessToken;
        const docH = { Authorization: `Bearer ${docToken}` };
        console.log(`   ✅ Doctor logged in successfully.`);

        // 9. Doctor Complete
        console.log("\n9. Doctor completing the appointment...");
        res = await request("POST", "/api/doctor/markAsComplete", {
            queueId: queueId
        }, docH);
        
        if (res.status !== 200) throw new Error(`Doctor complete failed: ${res.status} - ${JSON.stringify(res.data)}`);
        console.log(`   ✅ Appointment marked as COMPLETE! Completed count: ${res.data.completedCount}, Waiting count: ${res.data.waitingCount}`);

        console.log("\n🎉 END-TO-END FLOW COMPLETED SUCCESSFULLY! 🎉");
        
    } catch (err) {
        console.error("\n❌ TEST FAILED:", err.message);
    }
}

runFlow();
