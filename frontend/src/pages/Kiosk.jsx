import { useState, useEffect } from "react";
import API from "../api";

function Kiosk() {
    const [step, setStep] = useState(1);
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [doctorQueueMap, setDoctorQueueMap] = useState({});

    // Selection state
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    // Checkout & Result
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookingResult, setBookingResult] = useState(null);

    // Fetch initial departments
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await API.get("/patients/getDept");
                if (res.data.found) setDepartments(res.data.departments || []);
            } catch (err) {
                console.error("Error loading departments:", err);
            }
        };
        fetchDepts();
    }, []);

    // Fetch doctors when department is selected
    useEffect(() => {
        if (!selectedDept) {
            setDoctors([]);
            setDoctorQueueMap({});
            return;
        }

        const fetchDoctors = async () => {
            try {
                const res = await API.get(`/doctor/getDoctors/Dept/${selectedDept}`);
                const docList = res.data.doctors || [];
                setDoctors(docList);

                // Fetch queue slot status for each doctor
                const qMap = {};
                await Promise.all(docList.map(async (doc) => {
                    try {
                        const qRes = await API.get(`/patients/getQueuesByDId/${doc._id}`);
                        if (qRes.data.found) {
                            qMap[doc._id] = {
                                active: true,
                                limit: qRes.data.limit,
                                booked: qRes.data.booked,
                                status: doc.status
                            };
                        } else {
                            qMap[doc._id] = { active: false };
                        }
                    } catch {
                        qMap[doc._id] = { active: false };
                    }
                }));
                setDoctorQueueMap(qMap);
            } catch (err) {
                console.error("Error fetching doctors:", err);
            }
        };

        fetchDoctors();
    }, [selectedDept]);

    const handleNextStep = () => {
        if (step === 1 && (!selectedDept || !selectedDoctor)) {
            alert("Please select a department and a doctor");
            return;
        }
        if (step === 2 && (!name || !phone || !age || !gender)) {
            alert("Please fill in all patient details");
            return;
        }
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setStep(prev => prev - 1);
    };

    const handleReset = () => {
        setSelectedDept("");
        setSelectedDoctor("");
        setName("");
        setPhone("");
        setAge("");
        setGender("");
        setBookingResult(null);
        setError("");
        setStep(1);
    };

    const handleKioskRegister = async () => {
        setLoading(true);
        setError("");

        try {
            // 1. Create a dummy client payment (Kiosk uses counter cash payment simulation)
            const payRes = await API.post("/patients/payment", {
                patientId: "65bce0fc0a5687744b90b460", // temporary placeholder since patient account does not exist yet
                amount: 500,
                method: "CASH" // Mark as CASH payment
            });

            if (!payRes.data.payment?._id) {
                throw new Error("Payment initialization failed");
            }

            // 2. Register new walk-in patient in database
            // Walk-in emails are automatically generated
            const walkinEmail = `kiosk_${Date.now()}@smartcareq.com`;
            const regRes = await API.post("/patients/registerPatient", {
                name,
                phone,
                email: walkinEmail,
                password: "kiosk_auto_pass",
                age: Number(age),
                gender
            });

            if (!regRes.data.found) {
                throw new Error("Failed to register patient record");
            }

            const patientId = regRes.data.patientId;

            // 3. Book appointment with offline flag
            const bookRes = await API.post("/patients/bookAppointment", {
                patientId,
                doctorId: selectedDoctor,
                departmentId: selectedDept,
                paymentId: payRes.data.payment._id,
                isOffline: true // IMPORTANT: flag as walk-in insertion offset of 5
            });

            if (bookRes.status !== 201) {
                throw new Error(bookRes.data?.msg || "Failed to book slot");
            }

            // Fetch doctor & department name for receipt
            const docObj = doctors.find(d => d._id === selectedDoctor);
            const deptObj = departments.find(d => d._id === selectedDept);

            setBookingResult({
                tokenNumber: bookRes.data.tokenNumber,
                qrCode: bookRes.data.qrCode,
                appId: bookRes.data.appId,
                doctorName: docObj?.name,
                deptName: deptObj?.name
            });
            setStep(4);
        } catch (err) {
            console.error("Kiosk registration error:", err);
            setError(err.response?.data?.msg || err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            minHeight: "100vh", backgroundColor: "#f1f5f9", color: "#1e293b",
            fontFamily: "'Outfit', 'Inter', sans-serif", display: "flex", flexDirection: "column",
            alignItems: "center", justifyItems: "center", padding: "40px 20px", boxSizing: "border-box"
        }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <span style={{ fontSize: "54px" }}>🏥</span>
                <h1 style={{ margin: "10px 0 4px 0", fontSize: "36px", fontWeight: "800", color: "#1e3a8a" }}>SmartCare Registration Kiosk</h1>
                <p style={{ margin: 0, fontSize: "16px", color: "#64748b", fontWeight: "500" }}>Self-Service Walk-In Ticket Dispenser</p>
            </div>

            {/* Stepper Bar */}
            {step < 4 && (
                <div style={{ display: "flex", gap: "20px", marginBottom: "40px", width: "100%", maxWidth: "600px", justifyContent: "space-between" }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: "8px", borderRadius: "4px",
                            backgroundColor: step >= s ? "#3b82f6" : "#cbd5e1",
                            transition: "background-color 0.3s"
                        }}></div>
                    ))}
                </div>
            )}

            {/* Main Kiosk Card */}
            <div style={{
                backgroundColor: "white", borderRadius: "24px", padding: "40px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                width: "100%", maxWidth: "650px", border: "1px solid #e2e8f0", boxSizing: "border-box"
            }}>
                {error && (
                    <div style={{
                        padding: "16px 20px", background: "#fef2f2", border: "1px solid #fee2e2",
                        color: "#ef4444", borderRadius: "12px", fontWeight: "600", marginBottom: "24px"
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* STEP 1: SELECT CLINIC & DOCTOR */}
                {step === 1 && (
                    <div>
                        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1e3a8a", margin: "0 0 8px 0" }}>Step 1: Choose Clinic & Doctor</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px 0" }}>Please choose the department and doctor you wish to consult.</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Department</label>
                                <select
                                    value={selectedDept}
                                    onChange={(e) => { setSelectedDept(e.target.value); setSelectedDoctor(""); }}
                                    style={{
                                        width: "100%", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1",
                                        fontSize: "16px", outline: "none", boxSizing: "border-box"
                                    }}
                                >
                                    <option value="">-- Choose Department --</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>

                            {selectedDept && (
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Doctor</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {doctors.map(doc => {
                                            const info = doctorQueueMap[doc._id];
                                            const isOffline = !info || !info.active || info.status === "offline";
                                            const slots = info && typeof info.limit === "number" ? Math.max(0, info.limit - (info.booked || 0)) : 0;
                                            
                                            return (
                                                <div
                                                    key={doc._id}
                                                    onClick={() => !isOffline && setSelectedDoctor(doc._id)}
                                                    style={{
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        padding: "18px 24px", borderRadius: "16px", border: selectedDoctor === doc._id ? "3px solid #3b82f6" : "2px solid #e2e8f0",
                                                        backgroundColor: isOffline ? "#f8fafc" : selectedDoctor === doc._id ? "#eff6ff" : "white",
                                                        cursor: isOffline ? "not-allowed" : "pointer", opacity: isOffline ? 0.6 : 1,
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    <div>
                                                        <strong style={{ display: "block", fontSize: "16px", color: isOffline ? "#94a3b8" : "#1e293b" }}>Dr. {doc.name}</strong>
                                                        <span style={{ fontSize: "12px", color: isOffline ? "#cbd5e1" : "#64748b" }}>
                                                            {isOffline ? "🔴 Currently Offline" : `🟢 AvailableClinic | ${slots} slots remaining`}
                                                        </span>
                                                    </div>
                                                    {!isOffline && (
                                                        <div style={{
                                                            width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #3b82f6",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            backgroundColor: selectedDoctor === doc._id ? "#3b82f6" : "transparent"
                                                        }}>
                                                            {selectedDoctor === doc._id && <span style={{ width: "10px", height: "10px", backgroundColor: "white", borderRadius: "50%" }}></span>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {doctors.length === 0 && (
                                            <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>No doctors listed in this department today.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: "40px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                onClick={handleNextStep}
                                disabled={!selectedDoctor}
                                style={{
                                    padding: "16px 36px", backgroundColor: selectedDoctor ? "#3b82f6" : "#cbd5e1",
                                    color: "white", border: "none", borderRadius: "12px", fontSize: "16px",
                                    fontWeight: "bold", cursor: selectedDoctor ? "pointer" : "not-allowed"
                                }}
                            >
                                Next Step ➡️
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: PATIENT INFO */}
                {step === 2 && (
                    <div>
                        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1e3a8a", margin: "0 0 8px 0" }}>Step 2: Patient Information</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px 0" }}>Please type your exact details as per government ID.</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        width: "100%", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1",
                                        fontSize: "16px", outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="Enter 10-digit mobile number (+91)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    style={{
                                        width: "100%", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1",
                                        fontSize: "16px", outline: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Age</label>
                                    <input
                                        type="number"
                                        placeholder="Age"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        style={{
                                            width: "100%", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1",
                                            fontSize: "16px", outline: "none", boxSizing: "border-box"
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Gender</label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        style={{
                                            width: "100%", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1",
                                            fontSize: "16px", outline: "none", boxSizing: "border-box"
                                        }}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
                            <button
                                onClick={handlePrevStep}
                                style={{
                                    padding: "16px 28px", backgroundColor: "#fff", border: "2px solid #cbd5e1",
                                    color: "#64748b", borderRadius: "12px", fontSize: "16px",
                                    fontWeight: "bold", cursor: "pointer"
                                }}
                            >
                                ⬅️ Back
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={!name || !phone || !age || !gender}
                                style={{
                                    padding: "16px 36px", backgroundColor: (name && phone && age && gender) ? "#3b82f6" : "#cbd5e1",
                                    color: "white", border: "none", borderRadius: "12px", fontSize: "16px",
                                    fontWeight: "bold", cursor: (name && phone && age && gender) ? "pointer" : "not-allowed"
                                }}
                            >
                                Next Step ➡️
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PAYMENT & CONFIRM */}
                {step === 3 && (
                    <div>
                        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1e3a8a", margin: "0 0 8px 0" }}>Step 3: Consultation Payment</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px 0" }}>Confirm your clinic details and simulated consultation fee.</p>

                        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", marginBottom: "30px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Patient Name</span>
                                <strong style={{ color: "#1e293b" }}>{name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Consultation Clinic</span>
                                <strong style={{ color: "#1e293b" }}>{departments.find(d => d._id === selectedDept)?.name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Outpatient Doctor</span>
                                <strong style={{ color: "#1e293b" }}>Dr. {doctors.find(d => d._id === selectedDoctor)?.name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0 0" }}>
                                <span style={{ color: "#1e3a8a", fontWeight: "800", fontSize: "18px" }}>Consultation Fee</span>
                                <strong style={{ color: "#2e7d32", fontSize: "22px", fontWeight: "900" }}>₹500</strong>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <button
                                onClick={handleKioskRegister}
                                disabled={loading}
                                style={{
                                    padding: "18px", backgroundColor: "#10b981", color: "white",
                                    border: "none", borderRadius: "12px", fontSize: "18px", fontWeight: "bold",
                                    cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)"
                                }}
                            >
                                {loading ? "Registering appointment..." : "💵 Pay at Billing Counter (Cash Checkout)"}
                            </button>
                        </div>

                        <div style={{ marginTop: "40px", display: "flex", justifyContent: "flex-start" }}>
                            <button
                                onClick={handlePrevStep}
                                disabled={loading}
                                style={{
                                    padding: "16px 28px", backgroundColor: "#fff", border: "2px solid #cbd5e1",
                                    color: "#64748b", borderRadius: "12px", fontSize: "16px",
                                    fontWeight: "bold", cursor: "pointer"
                                }}
                            >
                                ⬅️ Back
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: PRINT RECEIPT / SUCCESS */}
                {step === 4 && bookingResult && (
                    <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "54px" }}>🎉</span>
                        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", margin: "10px 0 6px 0" }}>Registration Successful!</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 30px 0" }}>Your token slip has been generated. Please print or scan the ticket.</p>

                        {/* Printable Ticket Slip */}
                        <div id="print-area" style={{
                            border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "30px",
                            backgroundColor: "#fafafa", maxWidth: "350px", margin: "0 auto 30px auto",
                            boxSizing: "border-box"
                        }}>
                            <h3 style={{ margin: "0 0 4px 0", color: "#1e3a8a", fontSize: "20px", fontWeight: "900" }}>🏥 SmartCareQ</h3>
                            <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#94a3b8" }}>Walk-In Outpatient Slip</p>

                            <div style={{ margin: "14px 0" }}>
                                <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: "600" }}>Doctor</span>
                                <strong style={{ fontSize: "16px", color: "#1e293b" }}>Dr. {bookingResult.doctorName}</strong>
                            </div>

                            <div style={{ margin: "14px 0" }}>
                                <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: "600" }}>Department</span>
                                <strong style={{ fontSize: "14px", color: "#1e293b" }}>{bookingResult.deptName}</strong>
                            </div>

                            <div style={{
                                backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px 0",
                                margin: "20px 0", border: "1px solid #bfdbfe"
                            }}>
                                <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>YOUR TOKEN NUMBER</span>
                                <div style={{ fontSize: "40px", fontWeight: "900", color: "#1e3a8a", margin: "5px 0 0 0" }}>
                                    #{bookingResult.tokenNumber}
                                </div>
                            </div>

                            {bookingResult.qrCode && (
                                <div style={{ margin: "20px 0" }}>
                                    <img src={bookingResult.qrCode} alt="Kiosk Appointment QR" style={{ width: "160px", height: "160px" }} />
                                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>Scan this QR code at the doctor's clinic scanner.</p>
                                </div>
                            )}

                            <div style={{ fontSize: "10px", color: "#94a3b8", borderTop: "1px dashed #e2e8f0", paddingTop: "14px" }}>
                                Ticket Issued: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                            </div>
                        </div>

                        {/* Print slip button */}
                        <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                            <button
                                onClick={handlePrint}
                                style={{
                                    padding: "16px 28px", backgroundColor: "#3b82f6", color: "white",
                                    border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: "10px"
                                }}
                            >
                                🖨️ Print Slip
                            </button>
                            <button
                                onClick={handleReset}
                                style={{
                                    padding: "16px 28px", backgroundColor: "#f1f5f9", color: "#475569",
                                    border: "2px solid #cbd5e1", borderRadius: "12px", fontSize: "16px", fontWeight: "bold",
                                    cursor: "pointer"
                                }}
                            >
                                🔄 Register Next Patient
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; background: white !important; color: black !important; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
                }
            `}</style>
        </div>
    );
}

export default Kiosk;
