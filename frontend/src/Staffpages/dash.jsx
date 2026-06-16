import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import API from "../api";
import styles from "./staffs.module.css";
import Menubar from "../utils.jsx/menubar";

let menus = [
    { name: "View Live Queue", path: "/staff/ViewQueue" },
    { name: "Update Profile", path: "/staff/profile" },
    { name: "📺 TV Display Board", path: "/tv-display" }
];

function Staffdash() {
    let [show, toggleshow] = useState(false);
    let [sname, setname] = useState("");
    let [queues, setQueues] = useState([]);
    let [showScanner, setShowScanner] = useState(false);

    
    const [showWalkinModal, setShowWalkinModal] = useState(false);
    const [walkinName, setWalkinName] = useState("");
    const [walkinPhone, setWalkinPhone] = useState("");
    const [walkinAge, setWalkinAge] = useState("");
    const [walkinGender, setWalkinGender] = useState("");
    const [walkinQueueId, setWalkinQueueId] = useState("");
    const [walkinPayMethod, setWalkinPayMethod] = useState("CASH");
    const [walkinLoading, setWalkinLoading] = useState(false);
    const [walkinError, setWalkinError] = useState("");
    const [walkinSuccess, setWalkinSuccess] = useState(null);

    
    let [scanResult, setScanResult] = useState(null);
    let [scanMessage, setScanMessage] = useState("");

    
    let [noShowData, setNoShowData] = useState({});  

    
    async function fetchstaff() {
        try {
            let res = await API.get("/staff/getStaffById/me");
            setname(res.data.staff.name);
        } catch (e) {
            console.error("Error fetching staff:", e);
        }
    }

    
    async function fetchQueues() {
        try {
            let res = await API.get("/staff/getAssignedQueues/me");
            setQueues(res.data.queues || []);
        } catch (err) {
            if (err.response?.status === 404) {
                
                setQueues([]);
            } else {
                console.error("Error fetching queues:", err);
            }
        }
    }

    
    function scan() {
        const scanner = new Html5QrcodeScanner("reader", {
            fps: 10,
            qrbox: { width: 500, height: 350 }
        });
        scanner.render(onScanSuccess, () => { });

        function onScanSuccess(decodedText) {
            scanner.clear();
            setShowScanner(false);
            try {
                const data = JSON.parse(decodedText);
                handleQRScan(data);
            } catch {
                setScanMessage("❌ Invalid QR code format");
            }
        }

        return () => scanner.clear();
    }

    
    async function handleQRScan(data) {
        const appointmentId = data.appointmentId;
        if (!appointmentId) {
            setScanMessage("❌ No appointment ID in QR code");
            return;
        }

        
        let queueId = null;
        for (const q of queues) {
            const qId = q.queueId?._id;
            if (qId) {
                queueId = qId;
                break;
            }
        }

        if (!queueId) {
            
            try {
                const appRes = await API.get(`/patients/getAppointment/${appointmentId}`);
                if (appRes.data.found) {
                    queueId = appRes.data.appointment.queueId;
                }
            } catch (e) { }
        }

        if (!queueId) {
            setScanMessage("❌ Could not determine queue. Please try again.");
            return;
        }

        try {
            const res = await API.post("/staff/verifyAndAdmit", { queueId, appointmentId });

            if (res.data.rejoined) {
                setScanResult({
                    type: "rejoined",
                    name: res.data.patientName,
                    position: res.data.position
                });
                setScanMessage(`🔄 ${res.data.patientName} rejoined queue at position #${res.data.position}`);
            } else if (res.data.admitted) {
                setScanResult({
                    type: "admitted",
                    name: res.data.patientName
                });
                setScanMessage(`✅ ${res.data.patientName} checked in! Sent to doctor.`);
                
                setNoShowData(prev => {
                    const next = { ...prev };
                    delete next[queueId];
                    return next;
                });
            }

            fetchQueues();
        } catch (err) {
            const msg = err.response?.data?.msg || "Error processing scan";
            const position = err.response?.data?.position;
            if (position) {
                setScanMessage(`⏳ ${msg}. Patient is at position #${position}`);
            } else {
                setScanMessage(`❌ ${msg}`);
            }
            setScanResult(null);
        }
    }

    useEffect(() => {
        if (showScanner) {
            setTimeout(() => scan(), 200);
        }
    }, [showScanner]);

    
    useEffect(() => {
        if (!queues || queues.length === 0) return;

        const pollInterval = setInterval(async () => {
            for (const q of queues) {
                const qId = q.queueId?._id;
                if (!qId) continue;
                try {
                    const res = await API.get(`/staff/noShowStatus/${qId}`);
                    const data = res.data;

                    if (data.timerActive) {
                        setNoShowData(prev => ({
                            ...prev,
                            [qId]: { elapsed: data.elapsed, timedOut: data.timedOut }
                        }));
                    } else {
                        setNoShowData(prev => {
                            const next = { ...prev };
                            delete next[qId];
                            return next;
                        });
                    }
                } catch (e) { }
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [queues]);

    async function handleWalkinRegister() {
        if (!walkinName || !walkinPhone || !walkinAge || !walkinGender || !walkinQueueId) {
            setWalkinError("Please fill out all fields");
            return;
        }

        setWalkinLoading(true);
        setWalkinError("");

        try {
            
            const qObj = queues.find(q => q.queueId?._id === walkinQueueId);
            if (!qObj) {
                throw new Error("Selected queue not found in assigned list");
            }

            const doctorId = qObj.doctorId?._id;
            const departmentId = qObj.queueId?.departmentId?._id || qObj.queueId?.departmentId;

            
            const payRes = await API.post("/patients/payment", {
                patientId: "65bce0fc0a5687744b90b460", 
                amount: 500,
                method: walkinPayMethod
            });

            if (!payRes.data.payment?._id) {
                throw new Error("Payment record creation failed");
            }

            
            const walkinEmail = `staff_walkin_${Date.now()}@smartcareq.com`;
            const regRes = await API.post("/patients/registerPatient", {
                name: walkinName,
                phone: walkinPhone,
                email: walkinEmail,
                password: "kiosk_auto_pass",
                age: Number(walkinAge),
                gender: walkinGender
            });

            if (!regRes.data.found) {
                throw new Error("Patient registration failed");
            }

            const patientId = regRes.data.patientId;

            
            const bookRes = await API.post("/patients/bookAppointment", {
                patientId,
                doctorId,
                departmentId,
                paymentId: payRes.data.payment._id,
                isOffline: true
            });

            if (bookRes.status !== 201) {
                throw new Error(bookRes.data?.msg || "Failed to book queue slot");
            }

            
            setWalkinSuccess({
                tokenNumber: bookRes.data.tokenNumber,
                doctorName: qObj.doctorId?.name,
                qrCode: bookRes.data.qrCode
            });

            
            fetchQueues();
        } catch (err) {
            console.error("Staff walkin error:", err);
            setWalkinError(err.response?.data?.msg || err.message || "Failed to complete registration");
        } finally {
            setWalkinLoading(false);
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        fetchstaff();
    }, []);

    useEffect(() => {
        fetchQueues();
        const interval = setInterval(fetchQueues, 3000);
        return () => clearInterval(interval);
    }, []);



    return (
        <div className={styles.container}>
            <button onClick={() => toggleshow(!show)}
                style={{ borderRadius: '5px', border: 'none', width: '8ch', height: '8vh', position: 'fixed', top: '0px', left: '0px', cursor: 'pointer', fontSize: '18px' }}>
                ═
            </button>
            {show && <Menubar menus={menus} color={styles.Menu} />}

            <h2 className={styles.welcomeText}>Hello: {sname}</h2>

            {}
            {queues.length > 0 && (() => {
                const totalWaiting = queues.reduce((s, q) => s + (q.queueId?.waiting?.length || 0), 0);
                const totalSkipped = queues.reduce((s, q) => s + (q.queueId?.skipped?.length || 0), 0);
                const totalCompleted = queues.reduce((s, q) => s + (q.completedCount || 0), 0);
                const totalBooked = queues.reduce((s, q) => s + (q.queueId?.bookedAppointments || 0), 0);
                const hasInRoom = queues.some(q => q.queueId?.currentPatient);
                return (
                    <div style={{
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                        borderRadius: '12px', padding: '24px', marginBottom: '20px', color: 'white',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>📊 Queue Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900' }}>{totalBooked}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Booked</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(76,175,80,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#81c784' }}>{totalCompleted}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>✅ Completed</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(33,150,243,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#90caf9' }}>{totalWaiting}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>⏳ Waiting</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,152,0,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffb74d' }}>{totalSkipped}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>⏭️ Skipped</div>
                            </div>
                        </div>
                        {hasInRoom && (
                            <div style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(76,175,80,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>🩺</span>
                                <span style={{ fontWeight: '600' }}>
                                    In-Room: {queues.filter(q => q.queueId?.currentPatient).map(q => q.queueId.currentPatient.patientId?.name || 'Patient').join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })()}

            {}
            <div style={{ marginBottom: '20px' }}>
                <h3>📋 Assigned Queues:</h3>
                {queues.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {queues.map(q => (
                            <li key={q._id} style={{
                                background: 'rgba(17, 24, 39, 0.75)', padding: '16px', margin: '12px 0',
                                borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#cbd5e1', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>Dr. {q.doctorId?.name || 'N/A'}</strong>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                        color: q.queueId?.status === 'OPEN' ? '#34d399' : q.queueId?.status === 'PAUSED' ? '#fb923c' : '#f43f5e',
                                        background: q.queueId?.status === 'OPEN' ? 'rgba(16, 185, 129, 0.15)' : q.queueId?.status === 'PAUSED' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                        border: `1px solid ${q.queueId?.status === 'OPEN' ? 'rgba(16, 185, 129, 0.3)' : q.queueId?.status === 'PAUSED' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                                    }}>
                                        {q.queueId?.status || 'N/A'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '14px', marginBottom: '10px' }}>
                                    <div><strong style={{ color: '#94a3b8' }}>Capacity:</strong> {q.queueId?.maxCapacity || 0}</div>
                                    <div><strong style={{ color: '#94a3b8' }}>Booked:</strong> {q.queueId?.bookedAppointments || 0}</div>
                                    <div style={{ color: '#38bdf8' }}><strong style={{ color: '#94a3b8' }}>Waiting:</strong> {q.queueId?.waiting?.length || 0}</div>
                                    <div style={{ color: '#34d399' }}><strong style={{ color: '#94a3b8' }}>Done:</strong> {q.completedCount || 0}</div>
                                </div>

                                {}
                                {q.queueId?.currentPatient && (
                                    <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '8px', fontWeight: '600' }}>
                                        🩺 <strong>In-Room:</strong> {q.queueId.currentPatient.patientId?.name || 'Unknown'}
                                        {q.queueId.currentPatient.tokenNumber && ` | Token #${q.queueId.currentPatient.tokenNumber}`}
                                    </div>
                                )}

                                {}
                                {q.queueId?.waiting?.length > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5e1', padding: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                                        <strong>Queue Order:</strong>{' '}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                            {q.queueId.waiting.map((app, i) => (
                                                <span key={app._id || i} style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '12px', fontSize: '12px' }}>
                                                    #{app.tokenNumber} {app.patientId?.name || 'Unknown'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {}
                                {q.queueId?.skipped?.length > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#fb923c', padding: '10px', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.18)', borderRadius: '8px' }}>
                                        <strong>Skipped:</strong>{' '}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                            {q.queueId.skipped.map((app, i) => (
                                                <span key={app._id || i} style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '12px', fontSize: '12px' }}>
                                                    #{app.tokenNumber} {app.patientId?.name || 'Unknown'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No queues assigned yet.</p>
                )}
            </div>

            {}
            {Object.entries(noShowData).map(([qId, timer]) => {
                if (timer.elapsed <= 0) return null;
                const qObj = queues.find(q => q.queueId?._id === qId);
                const docName = qObj?.doctorId?.name ? `Dr. ${qObj.doctorId.name}` : "Clinic";
                return (
                    <div key={qId} style={{
                        background: timer.elapsed >= 90 ? '#ffebee' : '#fff3cd',
                        padding: '14px', marginBottom: '16px', borderRadius: '8px',
                        border: `2px solid ${timer.elapsed >= 90 ? '#f44336' : '#ffc107'}`
                    }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: timer.elapsed >= 90 ? '#c62828' : '#856404' }}>
                            🩺 {docName} — ⏳ Waiting for patient QR scan — {formatTime(timer.elapsed)} elapsed
                            {timer.elapsed < 120 && ` (auto-skip in ${formatTime(120 - timer.elapsed)})`}
                            {timer.elapsed >= 120 && " — ⚠️ TIMED OUT!"}
                        </p>
                    </div>
                );
            })}

            {}
            {scanMessage && (
                <div style={{
                    background: scanMessage.startsWith('✅') ? '#e8f5e9' : scanMessage.startsWith('🔄') ? '#e3f2fd' : scanMessage.startsWith('⏭️') ? '#fff3e0' : '#ffebee',
                    padding: '14px', marginBottom: '16px', borderRadius: '8px',
                    border: '1px solid #ddd', fontSize: '15px', fontWeight: 'bold'
                }}>
                    {scanMessage}
                    <button onClick={() => { setScanMessage(""); setScanResult(null); }}
                        style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>
                        ✕
                    </button>
                </div>
            )}

            {}
            <button
                type="button"
                onClick={() => { setShowScanner(!showScanner); setScanMessage(""); }}
                style={{
                    padding: '12px 24px', cursor: 'pointer', marginBottom: '10px',
                    borderRadius: '8px', border: '2px solid #333', fontWeight: 'bold',
                    fontSize: '16px', background: showScanner ? '#ffcdd2' : '#c8e6c9'
                }}
            >
                {showScanner ? "📷 Close Scanner" : "📷 Scan Patient QR"}
            </button>

            {}
            <button
                type="button"
                onClick={() => { setShowWalkinModal(true); setWalkinError(""); setWalkinSuccess(null); }}
                style={{
                    padding: '12px 24px', cursor: 'pointer', marginBottom: '10px', marginLeft: '10px',
                    borderRadius: '8px', border: '2px solid #333', fontWeight: 'bold',
                    fontSize: '16px', background: '#e0f2fe', color: '#0369a1'
                }}
            >
                ➕ Register Walk-in Patient
            </button>

            {}
            {showWalkinModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(3, 7, 18, 0.6)', backdropFilter: 'blur(6px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#0f172a', borderRadius: '16px', padding: '32px',
                        maxWidth: '550px', width: '95%', maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', textAlign: 'left',
                        color: '#cbd5e1', border: '1px solid rgba(13, 213, 195, 0.2)', fontFamily: "'Outfit', sans-serif"
                    }}>
                        <button onClick={() => setShowWalkinModal(false)}
                            style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '24px' }}>
                            ✕
                        </button>

                        {!walkinSuccess ? (
                            <div>
                                <h2 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>➕ Register Walk-in Patient</h2>

                                {walkinError && (
                                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f43f5e', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
                                        ⚠️ {walkinError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Patient Full Name</label>
                                        <input type="text" value={walkinName} onChange={e => setWalkinName(e.target.value)} placeholder="Full Name" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Phone Number</label>
                                        <input type="tel" value={walkinPhone} onChange={e => setWalkinPhone(e.target.value)} placeholder="10-digit Phone" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Age</label>
                                            <input type="number" value={walkinAge} onChange={e => setWalkinAge(e.target.value)} placeholder="Age" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Gender</label>
                                            <select value={walkinGender} onChange={e => setWalkinGender(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }}>
                                                <option value="">Select</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Select Queue / Doctor</label>
                                        <select value={walkinQueueId} onChange={e => setWalkinQueueId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }}>
                                            <option value="">-- Choose Clinic --</option>
                                            {queues.map(q => (
                                                <option key={q.queueId?._id} value={q.queueId?._id}>
                                                    Dr. {q.doctorId?.name} ({q.queueId?.status || 'OPEN'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: '#94a3b8' }}>Payment Method</label>
                                        <select value={walkinPayMethod} onChange={e => setWalkinPayMethod(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', boxSizing: 'border-box' }}>
                                            <option value="CASH">CASH (Received Hand Cash)</option>
                                            <option value="CARD">CARD Payment</option>
                                            <option value="UPI">UPI Payment</option>
                                        </select>
                                        <div style={{ marginTop: '8px', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                                            💰 Registration Fee: ₹500. This will be marked as PAID in database.
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowWalkinModal(false)}
                                        style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Cancel
                                    </button>
                                    <button onClick={handleWalkinRegister} disabled={walkinLoading || !walkinName || !walkinPhone || !walkinAge || !walkinGender || !walkinQueueId}
                                        style={{
                                            padding: '10px 24px', background: 'linear-gradient(135deg, #0dd5c3 0%, #0284c7 100%)', color: '#0f172a', border: 'none', borderRadius: '6px',
                                            cursor: 'pointer', fontWeight: 'bold', opacity: (walkinLoading || !walkinName || !walkinPhone || !walkinAge || !walkinGender || !walkinQueueId) ? 0.6 : 1
                                        }}>
                                        {walkinLoading ? "Registering..." : "Mark as Paid & Register"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '48px' }}>🎉</span>
                                <h3 style={{ margin: '10px 0', color: '#10b981' }}>Walk-in Registered!</h3>
                                <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '20px' }}>
                                    Patient has been added to Dr. {walkinSuccess.doctorName}'s queue.
                                </p>

                                <div style={{ border: '2px dashed rgba(13, 213, 195, 0.3)', padding: '20px', borderRadius: '8px', background: 'rgba(13, 213, 195, 0.05)', display: 'inline-block', minWidth: '220px', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Token Number</span>
                                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0dd5c3', margin: '4px 0' }}>
                                        #{walkinSuccess.tokenNumber}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Offline Walk-In Slip</span>
                                </div>

                                {walkinSuccess.qrCode && (
                                    <div style={{ margin: "20px 0" }}>
                                        <img src={walkinSuccess.qrCode} alt="Walk-In Patient QR" style={{ width: "160px", height: "160px", border: "1px solid rgba(255,255,255,0.1)", padding: "8px", borderRadius: "8px", background: "#ffffff" }} />
                                        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", marginBottom: 0 }}>Scan this QR code to check in or enter the queue.</p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button onClick={() => {
                                        setWalkinName(""); setWalkinPhone(""); setWalkinAge(""); setWalkinGender(""); setWalkinQueueId(""); setWalkinSuccess(null);
                                    }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #0dd5c3 0%, #0284c7 100%)', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Register Another
                                    </button>
                                    <button onClick={() => setShowWalkinModal(false)}
                                        style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showScanner && <div id="reader" style={{ width: '50ch', height: '45vh', marginBottom: '20px' }}></div>}


        </div>
    );
}

export default Staffdash;