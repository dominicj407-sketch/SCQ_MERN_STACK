import API from "../api";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Menubar from "../utils.jsx/menubar.jsx";
import styles from "./patients.module.css";

function BookAppointment() {
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors]         = useState([]);
    const [selectedDept, setSelectedDept]     = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [loading, setLoading]   = useState(false);
    const [patientId, setPatientId] = useState(null);
    const [patientName, setPatientName] = useState("");

    const [showSuccess, setShowSuccess]   = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [bookingError, setBookingError] = useState("");
    const [doctorQueueMap, setDoctorQueueMap] = useState({});
    const [pageLoading, setPageLoading] = useState(true);

    // Reports upload
    const [reportFiles, setReportFiles] = useState([]);

    const navigate   = useNavigate();
    const rzpRef     = useRef(null);

    const menus = [
        { name: "Home",            path: "/patient/dash" },
        { name: "My Appointments", path: "/patient/appointments" },
        { name: "Profile",         path: "/patient/profile" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    const loadScript = (src) =>
        new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
            const s = document.createElement("script");
            s.src     = src;
            s.onload  = () => resolve(true);
            s.onerror = () => resolve(false);
            document.body.appendChild(s);
        });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                await Promise.all([
                    (async () => {
                        try {
                            let res = await API.get("/patients/getPatientById/me");
                            if (res.data && res.data.p) {
                                setPatientId(res.data.p._id);
                                setPatientName(res.data.p.name);
                            }
                        } catch (err) {
                            console.error("fetchPatient error", err);
                        }
                    })(),
                    (async () => {
                        try {
                            let res = await API.get("/patients/getDept");
                            if (res.data && res.data.found) {
                                setDepartments(res.data.departments);
                            }
                        } catch (err) {
                            console.error("Error fetching departments:", err);
                        }
                    })()
                ]);
            } catch (err) {
                console.error("fetchInitialData error", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!selectedDept) { setDoctors([]); setDoctorQueueMap({}); return; }
        const fetchDoctors = async () => {
            try {
                let res = await API.get(`/doctor/getDoctors/Dept/${selectedDept}`);
                const list = res.data.doctors || [];
                setDoctors(list);
                const map = {};
                await Promise.all(
                    list.map(async (doc) => {
                        try {
                            const qRes = await API.get(`/patients/getQueuesByDId/${doc._id}`);
                            if (qRes.data.found) map[doc._id] = { active: true, limit: qRes.data.limit, booked: qRes.data.booked };
                            else map[doc._id] = { active: false };
                        } catch { map[doc._id] = { active: false }; }
                    })
                );
                setDoctorQueueMap(map);
            } catch (err) {
                console.error("Error fetching doctors:", err);
                setDoctors([]); setDoctorQueueMap({});
            }
        };
        fetchDoctors();
    }, [selectedDept]);

    function effectiveStatus(doctor) {
        const qInfo = doctorQueueMap[doctor._id];
        if (!qInfo || qInfo.active === false) return "offline";
        return doctor.status || "offline";
    }

    function displayLabel(doctor) {
        const st = effectiveStatus(doctor);
        if (st === "offline") return "🔴 Offline";
        let statsStr = "";
        const qInfo = doctorQueueMap[doctor._id];
        if (qInfo && typeof qInfo.limit === 'number') {
            const available = Math.max(0, qInfo.limit - (qInfo.booked || 0));
            statsStr = ` | ${available} slots left`;
        }
        if (st === "available") return `🟢 Available${statsStr}`;
        return `🟡 ${st}${statsStr}`;
    }

    // ── File Upload Handler ────────────────────────────────────────────────
    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length + reportFiles.length > 5) {
            alert("Maximum 5 reports allowed");
            return;
        }
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} is too large (max 5MB)`);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setReportFiles(prev => [...prev, { fileName: file.name, fileData: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }

    function removeReport(index) {
        setReportFiles(prev => prev.filter((_, i) => i !== index));
    }

    // ── Generate Receipt ───────────────────────────────────────────────────
    function generateReceipt(result) {
        const doctorName = doctors.find(d => d._id === selectedDoctor)?.name || 'N/A';
        const deptName = departments.find(d => d._id === selectedDept)?.name || 'N/A';
        const now = new Date();

        const receiptHTML = `<!DOCTYPE html><html><head><title>Payment Receipt - SmartCareQ</title>
<style>
body { font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 40px auto; padding: 30px; }
.header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 24px; }
.header h1 { color: #667eea; margin: 0; font-size: 28px; }
.header p { color: #888; margin: 4px 0 0 0; }
.row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.row .label { color: #666; font-weight: 600; }
.row .value { color: #333; font-weight: 500; }
.total { background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center; }
.total .amount { font-size: 32px; font-weight: 900; color: #2e7d32; }
.qr { text-align: center; margin: 20px 0; }
.qr img { width: 150px; height: 150px; }
.footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 16px; }
@media print { body { margin: 0; } }
</style></head><body>
<div class="header"><h1>🏥 SmartCareQ</h1><p>Payment Receipt</p></div>
<div class="row"><span class="label">Patient</span><span class="value">${patientName}</span></div>
<div class="row"><span class="label">Doctor</span><span class="value">Dr. ${doctorName}</span></div>
<div class="row"><span class="label">Department</span><span class="value">${deptName}</span></div>
<div class="row"><span class="label">Token Number</span><span class="value">#${result.tokenNumber}</span></div>
<div class="row"><span class="label">Appointment ID</span><span class="value" style="font-size:11px">${result.appId}</span></div>
<div class="row"><span class="label">Date & Time</span><span class="value">${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')}</span></div>
<div class="row"><span class="label">Payment Method</span><span class="value">ONLINE (Razorpay)</span></div>
<div class="total"><p style="color:#666;margin:0 0 6px 0">Amount Paid</p><div class="amount">₹500</div><p style="color:#2e7d32;margin:6px 0 0 0;font-weight:600">✅ PAID</p></div>
${result.qrCode ? `<div class="qr"><p style="color:#666;font-size:13px">Show this QR at the clinic</p><img src="${result.qrCode}" /></div>` : ''}
<div class="footer"><p>Thank you for choosing SmartCareQ</p><p>This is a computer-generated receipt</p></div>
</body></html>`;

        const w = window.open('', '_blank');
        w.document.write(receiptHTML);
        w.document.close();
    }

    const handleBook = async () => {
        if (!selectedDept || !selectedDoctor) {
            alert("Please select department and doctor");
            return;
        }
        if (!patientId) {
            alert("Patient information not loaded yet. Please wait or refresh the page.");
            return;
        }
        setBookingError("");
        setLoading(true);
        const sdkLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!sdkLoaded) { alert("Razorpay SDK failed to load"); setLoading(false); return; }

        try {
            // NEW: Pre-validate before even loading Razorpay or generating Order!
            await API.post("/patients/validateBooking", { patientId, doctorId: selectedDoctor });
        } catch (err) {
            const msg = err.response?.data?.msg || err.response?.data?.message || "Validation failed";
            setBookingError(msg);
            setLoading(false);
            return;
        }

        try {
            const { data: order } = await API.post("/patients/create-order", { amount: 500 });

            const options = {
                key: "rzp_test_SGR9qfZK8ypm0h",
                amount: order.amount,
                currency: "INR",
                name: "SmartCare Queue",
                description: "Appointment Booking — ₹500",
                order_id: order.id,

                handler: async function (response) {
                    if (rzpRef.current) rzpRef.current.close();
                    try {
                        const { data: verifyData } = await API.post("/patients/verify-payment", response);
                        if (!verifyData.success) { setBookingError("Payment verification failed."); setLoading(false); return; }

                        const paymentRes = await API.post("/patients/payment", {
                            patientId, amount: 500, method: "ONLINE",
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id
                        });
                        const bookRes = await API.post("/patients/bookAppointment", {
                            patientId,
                            doctorId: selectedDoctor,
                            departmentId: selectedDept,
                            paymentId: paymentRes.data.payment._id,
                            reports: reportFiles
                        });

                        setBookingResult({
                            tokenNumber: bookRes.data.tokenNumber,
                            qrCode: bookRes.data.qrCode,
                            appId: bookRes.data.appId
                        });
                        setShowSuccess(true);
                    } catch (err) {
                        if (err.response?.status === 409) {
                            setBookingError("You already have an active appointment today. Please complete or cancel it before booking another.");
                        } else {
                            setBookingError(err.response?.data?.msg || err.response?.data?.message || "Something went wrong after payment.");
                        }
                    } finally { setLoading(false); }
                },

                prefill: { name: patientName, email: "", contact: "" },
                theme: { color: "#3399cc" },
                modal: { ondismiss: () => { setLoading(false); } }
            };

            const paymentObject = new window.Razorpay(options);
            rzpRef.current = paymentObject;
            paymentObject.open();
        } catch (err) {
            console.error("Order creation failed:", err);
            alert("Unable to initiate payment. Please try again.");
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className={styles.patientContainer}>
                <div className={styles.contentWrapper}>
                    <Menubar menus={menus} color="blue" />
                    <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>Loading appointment details...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={styles.patientContainer}>
                <div className={styles.contentWrapper}>
                    <Menubar menus={menus} color="blue" />

                    <div className={styles.mainContent}>
                        <h1 className={styles.pageTitle}>Book Appointment</h1>

                        {bookingError && (
                            <div style={{
                                background: '#ffebee', border: '2px solid #f44336',
                                borderRadius: '8px', padding: '14px 18px',
                                marginBottom: '16px', color: '#c62828', fontSize: '14px'
                            }}>
                                ⚠️ {bookingError}
                                {(bookingError.includes("active appointment") || bookingError.includes("per day")) && (
                                    <> &nbsp;
                                        <a href="/patient/appointments" style={{ color: '#1565c0', fontWeight: 'bold', textDecoration: 'underline' }}>
                                            View My Appointments →
                                        </a>
                                    </>
                                )}
                            </div>
                        )}

                        <div className={styles.formContainer}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Select Department:</label>
                                <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setBookingError(""); }} className={styles.formSelect}>
                                    <option value="">Choose Department</option>
                                    {departments.map(dept => (<option key={dept._id} value={dept._id}>{dept.name}</option>))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Select Doctor:</label>
                                <select value={selectedDoctor} onChange={(e) => { setSelectedDoctor(e.target.value); setBookingError(""); }} className={styles.formSelect} disabled={!selectedDept}>
                                    <option value="">Choose Doctor</option>
                                    {doctors.map(doctor => {
                                        const eff = effectiveStatus(doctor);
                                        return (
                                            <option key={doctor._id} value={doctor._id} disabled={eff === "offline"}>
                                                {doctor.name} — {displayLabel(doctor)}
                                            </option>
                                        );
                                    })}
                                </select>
                                {selectedDept && Object.keys(doctorQueueMap).length > 0 && (
                                    <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
                                        🔴 Offline = no queue today | 🟢 Available = queue is open
                                    </p>
                                )}
                            </div>

                            {/* ── Report Upload Section ──────────────────────── */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>📄 Upload Previous Reports (optional):</label>
                                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px 0' }}>
                                    Attach previous checkup reports (images/PDFs, max 5MB each, up to 5 files)
                                </p>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    onChange={handleFileSelect}
                                    style={{
                                        width: '100%', padding: '10px', border: '2px dashed #ccc',
                                        borderRadius: '8px', cursor: 'pointer', boxSizing: 'border-box'
                                    }}
                                />
                                {reportFiles.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                        {reportFiles.map((f, i) => (
                                            <div key={i} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '8px 12px', background: '#f0f7ff', borderRadius: '6px',
                                                marginBottom: '6px', fontSize: '14px'
                                            }}>
                                                <span>📎 {f.fileName}</span>
                                                <button onClick={() => removeReport(i)}
                                                    style={{ border: 'none', background: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleBook} disabled={loading || !selectedDept || !selectedDoctor} className={styles.bookButton}>
                                {loading ? "⏳ Processing…" : "Book & Pay ₹500"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Success Modal ──────────────────────────────────────────── */}
            {showSuccess && bookingResult && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px', padding: '36px',
                        maxWidth: '440px', width: '90%', textAlign: 'center',
                        boxShadow: '0 10px 50px rgba(0,0,0,0.35)'
                    }}>
                        <div style={{ fontSize: '52px', marginBottom: '8px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 6px 0', color: '#2e7d32' }}>Appointment Confirmed!</h2>
                        <p style={{ color: '#555', fontSize: '14px', margin: '0 0 20px 0' }}>Show this QR code to staff when you arrive.</p>

                        <div style={{ background: '#e8f5e9', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 4px 0' }}>Your Token Number</p>
                            <p style={{ fontSize: '42px', fontWeight: '900', color: '#1b5e20', margin: 0 }}>#{bookingResult.tokenNumber}</p>
                        </div>

                        {bookingResult.qrCode && (
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '13px', color: '#777', marginBottom: '8px' }}>Scan at the clinic entrance</p>
                                <img src={bookingResult.qrCode} alt="QR Code" style={{ width: '180px', height: '180px', border: '4px solid #c8e6c9', borderRadius: '8px' }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => generateReceipt(bookingResult)}
                                style={{ padding: '12px 20px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                                🧾 Download Receipt
                            </button>
                            <button onClick={() => { setShowSuccess(false); navigate("/patient/appointments"); }}
                                style={{ padding: '12px 24px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                                View Appointments
                            </button>
                            <button onClick={() => { setShowSuccess(false); navigate("/patient/dash"); }}
                                style={{ padding: '12px 20px', backgroundColor: '#78909c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default BookAppointment;