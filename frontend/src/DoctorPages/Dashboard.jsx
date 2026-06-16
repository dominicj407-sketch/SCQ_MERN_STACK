import Menubar from '../utils.jsx/menubar';
import Menubutton from '../utils.jsx/menubutton';
import Styles from './doctor.module.css';
import { useEffect, useRef, useState } from 'react';
import API from '../api';

function Doctordash() {
    let [doctor, setdoctor] = useState(null);
    let [status, setstatus] = useState("loading");
    let [active, setActive] = useState('');
    let [patient, setCurrentPatient] = useState("");
    let [currentAppointment, setCurrentAppointmentData] = useState(null);
    let [queueID, setcurrentqueueId] = useState("");
    let [dayStarted, setDayStarted] = useState(false);
    let [completedCount, setCompletedCount] = useState(0);
    let [remainingCount, setRemainingCount] = useState(0);
    let [skippedCount, setSkippedCount] = useState(0);
    let [waitingForScan, setWaitingForScan] = useState(false);
    let [scanElapsed, setScanElapsed] = useState(0);
    let [queueStatus, setQueueStatus] = useState("");
    let [pausedAt, setPausedAt] = useState(null);
    let [queueDetails, setQueueDetails] = useState(null);

    
    let [notes, setNotes] = useState("");
    let [notesSaving, setNotesSaving] = useState(false);
    let [notesMsg, setNotesMsg] = useState("");

    
    let [showCheckoutModal, setShowCheckoutModal] = useState(false);
    let [prescriptionText, setPrescriptionText] = useState("");
    let [prescriptionUrl, setPrescriptionUrl] = useState("");

    
    let [patientHistory, setPatientHistory] = useState([]);
    let [showHistory, setShowHistory] = useState(false);
    let [appointmentReports, setAppointmentReports] = useState([]);
    let [showReports, setShowReports] = useState(false);

    const scanTimerRef = useRef(null);

    
    async function getdoctorinfo() {
        try {
            let res = await API.get("/doctor/me");
            const d = res.data.d;
            setdoctor(d);
            setstatus("display");
            if (d && d.status) {
                setActive(d.status);
                if (d.status !== 'offline') setDayStarted(true);
            }
        } catch (e) {
            console.error("Error fetching doctor info:", e);
            setstatus("display");
        }
    }

    useEffect(() => { getdoctorinfo(); }, []);

    
    async function updatestatus() {
        if (!doctor || !doctor._id) return;
        try {
            await API.put(`/doctor/updateStatus/${doctor.id || 'me'}`, { status: active, id: doctor._id });
        } catch (e) { console.error("Error updating status:", e); }
    }

    useEffect(() => {
        if (active) {
            updatestatus();
            if (active === 'offline') { setDayStarted(false); stopScanTimer(); setWaitingForScan(false); }
            else { setDayStarted(true); }
        }
    }, [active]);

    
    async function fetchCurrentPatient(doctorId) {
        if (!doctorId) return;
        try {
            let res = await API.get(`/doctor/getCurrentPatient/${doctorId}`);
            if (res.data.queueStatus) setQueueStatus(res.data.queueStatus);

            if (res.data.waitingForScan) {
                setCurrentPatient({ name: "⏳ Waiting for patient to scan QR..." });
                setCurrentAppointmentData(null);
                if (queueStatus !== "PAUSED") { setWaitingForScan(true); setScanElapsed(res.data.elapsed || 0); }
                setRemainingCount(res.data.waitingCount || 0);
                return;
            }
            if (res.data.found && res.data.currentPatient) {
                setCurrentPatient(res.data.currentPatient);
                setCurrentAppointmentData(res.data.currentAppointment || null);
                setcurrentqueueId(res.data.queueId);
                setWaitingForScan(false);
                stopScanTimer();
                fetchQueueStats(res.data.queueId);

                
                if (res.data.currentAppointment) {
                    setNotes(res.data.currentAppointment.notes || "");
                    setAppointmentReports(res.data.currentAppointment.reports || []);
                }
                
                if (res.data.currentPatient?._id) {
                    fetchPatientHistory(res.data.currentPatient._id);
                }
                return;
            }
            if (!res.data.found) {
                setCurrentPatient({ name: "No patients in queue" });
                setCurrentAppointmentData(null);
                setWaitingForScan(false);
                stopScanTimer();
            }
        } catch (e) {
            const msg = e.response?.data?.msg;
            if (msg === 'No patients') setCurrentPatient({ name: "No patients in queue" });
            else if (msg === 'No queue found') setCurrentPatient({ name: "No queue created today" });
            setCurrentAppointmentData(null);
            setWaitingForScan(false);
            stopScanTimer();
        }
    }

    async function fetchQueueDetails() {
        try {
            let res = await API.get("/doctor/queue/details");
            if (res.data.found) {
                setQueueDetails(res.data.queue);
                if (res.data.queue._id) {
                    setcurrentqueueId(res.data.queue._id);
                }
            } else {
                setQueueDetails(null);
            }
        } catch (e) {
            console.error("Error fetching queue details:", e);
        }
    }

    async function handleEmergencyOverride(appointmentId) {
        if (!queueID) return;
        if (!window.confirm("Are you sure you want to flag this appointment as an EMERGENCY override? This will move them to Position 1.")) return;
        try {
            await API.post("/doctor/emergencyOverride", { queueId: queueID, appointmentId });
            alert("🚨 Emergency override successful. Patient moved to Position 1.");
            fetchQueueDetails();
            if (doctor && doctor._id) {
                fetchCurrentPatient(doctor._id);
            }
        } catch (err) {
            console.error("Emergency override error:", err);
            alert("Error: " + (err.response?.data?.msg || err.message));
        }
    }

    
    async function fetchPatientHistory(patientId) {
        try {
            let res = await API.get(`/doctor/patientHistory/${patientId}`);
            setPatientHistory(res.data.bookings || []);
        } catch (e) { setPatientHistory([]); }
    }

    
    async function fetchQueueStatsForDoctor(doctorId) {
        try {
            let queueRes = await API.get(`/patients/getQueuesByDId/${doctorId}`);
            if (queueRes.data.found) {
                const qId = queueRes.data.queueId;
                setcurrentqueueId(qId);
                fetchQueueStats(qId);
            }
        } catch (e) {}
    }

    async function fetchQueueStats(qId) {
        try {
            let res = await API.get(`/patients/getQueueStatus/${qId}`);
            if (res.data.found) {
                setRemainingCount(res.data.waitingCount || 0);
                setSkippedCount(res.data.skippedCount || 0);
                setCompletedCount(res.data.completedCount || 0);
                setQueueStatus(res.data.queue?.status || "");
            }
        } catch (e) {}
    }

    useEffect(() => {
        if (doctor && doctor._id) {
            fetchCurrentPatient(doctor._id);
            fetchQueueStatsForDoctor(doctor._id);
            fetchQueueDetails();
        }
    }, [doctor]);

    useEffect(() => {
        if (!doctor || !doctor._id) return;
        const pollInterval = setInterval(() => {
            fetchCurrentPatient(doctor._id);
            fetchQueueDetails();
            if (queueID) fetchQueueStats(queueID);
            else fetchQueueStatsForDoctor(doctor._id);
        }, 3000);
        return () => clearInterval(pollInterval);
    }, [doctor?._id, queueID]);

    
    useEffect(() => {
        if (waitingForScan && queueStatus !== "PAUSED") startScanTimer();
        else stopScanTimer();
        return () => stopScanTimer();
    }, [waitingForScan, queueStatus]);

    const startScanTimer = () => {
        if (scanTimerRef.current) return;
        scanTimerRef.current = setInterval(() => setScanElapsed(prev => prev + 1), 1000);
    };
    const stopScanTimer = () => {
        if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    };

    
    async function handlePauseQueue() {
        if (!queueID) return;
        try {
            await API.get(`/doctor/pauseQueue/${queueID}`);
            setQueueStatus("PAUSED"); setWaitingForScan(false); stopScanTimer(); setPausedAt(Date.now());
        } catch (e) { alert("Error pausing queue: " + (e.response?.data?.msg || e.message)); }
    }
    async function handleResumeQueue() {
        if (!queueID) return;
        try {
            await API.get(`/doctor/resumeQueue/${queueID}`);
            setQueueStatus("OPEN"); setPausedAt(null); setScanElapsed(0);
            if (remainingCount > 0) setWaitingForScan(true);
        } catch (e) { alert("Error resuming queue: " + (e.response?.data?.msg || e.message)); }
    }

    
    async function saveNotes() {
        if (!currentAppointment?._id) return;
        setNotesSaving(true);
        try {
            await API.post(`/doctor/addNotes/${currentAppointment._id}`, { notes });
            setNotesMsg("✅ Notes saved!");
            setTimeout(() => setNotesMsg(""), 3000);
        } catch (e) {
            setNotesMsg("❌ Failed to save notes");
        }
        setNotesSaving(false);
    }

    
    async function checkOut(queueId) {
        try {
            let res = await API.post("/doctor/markAsComplete", { queueId, prescriptionText, prescriptionUrl });
            setCompletedCount(res.data.completedCount || completedCount + 1);
            setRemainingCount(res.data.waitingCount || 0);
            setSkippedCount(res.data.skippedCount || 0);
            setNotes(""); setNotesMsg(""); setPatientHistory([]); setAppointmentReports([]); setShowHistory(false); setShowReports(false);
            setPrescriptionText(""); setPrescriptionUrl("");
            setShowCheckoutModal(false);
            if (res.data.waitingCount > 0) {
                setCurrentPatient({ name: "⏳ Waiting for next patient to scan QR..." });
                setCurrentAppointmentData(null);
                setWaitingForScan(true);
                setScanElapsed(0);
            } else {
                setCurrentPatient({ name: "✅ All patients completed for today!" });
                setCurrentAppointmentData(null);
                setWaitingForScan(false);
            }
        } catch (e) { alert(e.response?.data?.msg || "Error during checkout"); }
    }

    
    const startDay = () => {
        setDayStarted(true); setActive('available'); setCompletedCount(0);
        if (remainingCount > 0) {
            setCurrentPatient({ name: "⏳ Waiting for first patient to scan QR..." });
            setWaitingForScan(true); setScanElapsed(0);
        } else setCurrentPatient({ name: "No patients booked yet" });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    let menu = [
        { name: "Profile", path: "/doctor/profile" },
        { name: "Set Daily Limits", path: "/doctor/dailycapacity" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];
    let [toggle, settoggle] = useState(false);

    const isPaused = queueStatus === "PAUSED";
    const isInRoom = currentAppointment && patient?.name && !waitingForScan &&
        patient.name !== "No patients in queue" && patient.name !== "No queue created today" &&
        patient.name !== "No patients booked yet" && patient.name !== "✅ All patients completed for today!" &&
        !patient.name?.startsWith("⏳");

    return (
        <>
            {status === 'loading' ? <h2>Loading...</h2> : status === 'display' &&
                <div style={{ minHeight: '100vh' }} className={Styles.outer}>
                    <header style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '50px', backgroundColor: '#919191', padding: '0 20px' }}>
                        <Menubutton togglemenu={() => settoggle(!toggle)} button={Styles.button}></Menubutton>
                        <h2 style={{ margin: '0px' }}>WELCOME, Dr. {doctor?.name || ''}</h2>
                        <span></span>
                    </header>
                    <div>
                        {toggle && <Menubar menus={menu} color={Styles.menubar}></Menubar>}
                        <div className={Styles.container}>
                            <h2>LIVE QUEUE</h2>

                            <div className={Styles.card} style={{ minHeight: '35vh', width: '65ch', borderRadius: '10px', padding: '20px' }}>
                                {}
                                {queueStatus && (
                                    <div style={{
                                        padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px',
                                        alignSelf: 'center', marginBottom: '8px',
                                        background: isPaused ? '#fff3cd' : queueStatus === 'CLOSED' ? '#ffebee' : '#e8f5e9',
                                        color: isPaused ? '#856404' : queueStatus === 'CLOSED' ? '#c62828' : '#2e7d32',
                                        border: `2px solid ${isPaused ? '#ffc107' : queueStatus === 'CLOSED' ? '#f44336' : '#4caf50'}`
                                    }}>
                                        {isPaused ? '⏸️ QUEUE PAUSED' : queueStatus === 'CLOSED' ? '🔴 QUEUE CLOSED' : '🟢 QUEUE ACTIVE'}
                                    </div>
                                )}

                                <h3>Current Patient: {patient?.name || "None"}</h3>

                                {}
                                {waitingForScan && !isPaused && (
                                    <div style={{
                                        marginTop: '10px', padding: '12px', borderRadius: '8px',
                                        background: scanElapsed >= 120 ? '#ffebee' : scanElapsed >= 90 ? '#fff3cd' : '#e8f5e9',
                                        border: `2px solid ${scanElapsed >= 120 ? '#f44336' : scanElapsed >= 90 ? '#ff9800' : '#4caf50'}`
                                    }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>⏱️ Waiting: {formatTime(scanElapsed)}</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: scanElapsed >= 120 ? '#c62828' : '#555' }}>
                                            {scanElapsed >= 120 ? '⚠️ No-show! Staff has been notified to skip patient.' : `Patient has ${formatTime(120 - scanElapsed)} to scan QR`}
                                        </p>
                                    </div>
                                )}
                                {isPaused && (
                                    <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#fff3cd', border: '2px solid #ffc107' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#856404' }}>⏸️ Queue is paused — Timer stopped</p>
                                    </div>
                                )}

                                {}
                                <div style={{ marginTop: '12px', fontSize: '15px', fontWeight: 'bold' }}>
                                    <p>📊 Total: {completedCount + remainingCount + skippedCount}</p>
                                    <p>✅ Completed: {completedCount} | ⏳ Waiting: {remainingCount} | ⏭️ Skipped: {skippedCount}</p>
                                </div>

                                {}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                                    {!dayStarted ? (
                                        <button onClick={startDay} className={Styles.btn} style={{ color: 'black', fontWeight: 'bold', fontSize: '16px' }}>🟢 Start Day</button>
                                    ) : (
                                        <>
                                            {queueID && !isPaused && (
                                                <button onClick={handlePauseQueue} className={Styles.btn} style={{ backgroundColor: '#ff9800', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>⏸️ Pause Queue</button>
                                            )}
                                            {queueID && isPaused && (
                                                <button onClick={handleResumeQueue} className={Styles.btn} style={{ backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>▶️ Resume Queue</button>
                                            )}
                                            {queueID && (
                                                <button onClick={async () => {
                                                    if (!window.confirm(`⚠️ Cancel entire queue?\n\nThis will:\n• Cancel all waiting appointments\n• Issue automatic refunds\n• Set your status to offline\n\nAre you sure?`)) return;
                                                    try {
                                                        const res = await API.post("/doctor/cancelQueue", { queueId: queueID });
                                                        alert(`✅ Queue cancelled!\n${res.data.cancelledCount} appointments cancelled.\n${res.data.refundedCount} refunds initiated.`);
                                                        setActive('offline');
                                                        setCurrentPatient({ name: "Queue cancelled" });
                                                        setCurrentAppointmentData(null);
                                                        setWaitingForScan(false);
                                                        setRemainingCount(0);
                                                        setQueueStatus("CLOSED");
                                                    } catch (e) {
                                                        alert("Error cancelling queue: " + (e.response?.data?.msg || e.message));
                                                    }
                                                }} className={Styles.btn} style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                                    🚫 Cancel Queue & Refund
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {isInRoom && (
                                        <button onClick={() => {
                                            setPrescriptionText("");
                                            setPrescriptionUrl("");
                                            setShowCheckoutModal(true);
                                        }} className={Styles.btn} style={{ color: 'black', fontWeight: 'bold' }}>✅ Mark Complete</button>
                                    )}
                                </div>
                            </div>

                            {}
                            {isInRoom && (
                                <div style={{ width: '65ch', marginTop: '10px' }}>

                                    {}
                                    <div style={{
                                        background: 'rgba(17, 24, 39, 0.75)', borderRadius: '10px', padding: '20px', marginBottom: '15px',
                                        border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>📝 Doctor Notes</h3>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Add consultation notes for this patient..."
                                            style={{
                                                width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                                color: '#f8fafc', fontSize: '14px', fontFamily: 'inherit',
                                                resize: 'vertical', boxSizing: 'border-box'
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                                            <button onClick={saveNotes} disabled={notesSaving} className={Styles.saveBtn}
                                                style={{ fontWeight: 'bold' }}>
                                                {notesSaving ? "Saving..." : "💾 Save Notes"}
                                            </button>
                                            {notesMsg && <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>{notesMsg}</span>}
                                        </div>
                                    </div>

                                    {}
                                    <div style={{
                                        background: 'rgba(17, 24, 39, 0.75)', borderRadius: '10px', padding: '20px', marginBottom: '15px',
                                        border: '1px solid rgba(249, 115, 22, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, color: '#fb923c' }}>📄 Patient Reports ({appointmentReports.length})</h3>
                                            {appointmentReports.length > 0 && (
                                                <button onClick={() => setShowReports(!showReports)} className={Styles.reportsBtn}
                                                    style={{ fontSize: '13px', fontWeight: '600' }}>
                                                    {showReports ? 'Hide' : 'View Reports'}
                                                </button>
                                            )}
                                        </div>
                                        {appointmentReports.length === 0 && (
                                            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '8px 0 0 0' }}>No reports uploaded for this appointment.</p>
                                        )}
                                        {showReports && appointmentReports.map((r, i) => (
                                            <div key={i} style={{ marginTop: '10px', padding: '12px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.18)' }}>
                                                <strong style={{ fontSize: '14px', color: '#ffffff' }}>{r.fileName || `Report ${i + 1}`}</strong>
                                                <div style={{ marginTop: '8px' }}>
                                                    {r.fileData?.startsWith('data:image') ? (
                                                        <img src={r.fileData} alt={r.fileName} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }} />
                                                    ) : r.fileData?.startsWith('data:application/pdf') ? (
                                                        <a href={r.fileData} download={r.fileName || 'report.pdf'}
                                                            style={{ color: '#38bdf8', fontWeight: '600', textDecoration: 'underline' }}>
                                                            📥 Download PDF
                                                        </a>
                                                    ) : (
                                                        <a href={r.fileData} download={r.fileName || 'report'}
                                                            style={{ color: '#38bdf8', fontWeight: '600', textDecoration: 'underline' }}>
                                                            📥 Download File
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Past Bookings ────────────────────────── */}
                                    <div style={{
                                        background: 'rgba(17, 24, 39, 0.75)', borderRadius: '10px', padding: '20px',
                                        border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, color: '#34d399' }}>📋 Patient History ({patientHistory.length})</h3>
                                            {patientHistory.length > 0 && (
                                                <button onClick={() => setShowHistory(!showHistory)} className={Styles.historyBtn}
                                                    style={{ fontSize: '13px', fontWeight: '600' }}>
                                                    {showHistory ? 'Hide' : 'View History'}
                                                </button>
                                            )}
                                        </div>
                                        {patientHistory.length === 0 && (
                                            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '8px 0 0 0' }}>No previous visits found.</p>
                                        )}
                                        {showHistory && patientHistory.filter(h => h._id !== currentAppointment?._id).map((h, i) => (
                                            <div key={i} style={{
                                                marginTop: '10px', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px',
                                                border: '1px solid rgba(16, 185, 129, 0.18)', fontSize: '14px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <strong style={{ color: '#ffffff' }}>Dr. {h.doctorId?.name || 'N/A'}</strong>
                                                    <span style={{
                                                        padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                                                        background: h.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : h.status === 'CANCELLED' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                                        color: h.status === 'COMPLETED' ? '#34d399' : h.status === 'CANCELLED' ? '#f43f5e' : '#fb923c'
                                                    }}>{h.status}</span>
                                                </div>
                                                <div style={{ color: '#94a3b8' }}>
                                                    📅 {new Date(h.bookedAt || h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    {h.departmentId?.name && ` | 🏥 ${h.departmentId.name}`}
                                                    {h.tokenNumber && ` | Token #${h.tokenNumber}`}
                                                </div>
                                                {h.notes && (
                                                    <div style={{ marginTop: '6px', padding: '6px 10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.18)', borderRadius: '6px', color: '#cbd5e1' }}>
                                                        <strong>Notes:</strong> {h.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Controls */}
                            <div style={{ marginTop: '10px' }}><h2>Set Status</h2></div>
                            <div className={Styles.statusCard}>
                                <button className={`${Styles.btn} ${active === 'offline' ? Styles.offActive : ''}`} onClick={() => setActive('offline')}>Offline</button>
                                <button className={`${Styles.btn} ${active === 'available' ? Styles.availActive : ''}`} onClick={() => setActive('available')}>Available</button>
                                <button className={`${Styles.btn} ${active === 'emergency' ? Styles.roomActive : ''}`} onClick={() => setActive('emergency')}>Emergency</button>
                                <button className={`${Styles.btn} ${active === 'break' ? Styles.breakActive : ''}`} onClick={() => setActive('break')}>Break</button>
                                <button className={`${Styles.btn} ${active === 'inroom' ? Styles.roomActive : ''}`} onClick={() => setActive('inroom')}>In-Room</button>
                            </div>

                            {/* Waiting Queue List Card */}
                            {queueDetails && (queueDetails.waiting?.length > 0 || queueDetails.skipped?.length > 0) && (
                                <div className={Styles.card} style={{ width: '65ch', borderRadius: '16px', padding: '24px', marginTop: '20px', alignItems: 'stretch' }}>
                                    <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginTop: 0, color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>⏳ Waiting Patients ({queueDetails.waiting?.length || 0})</h3>
                                    
                                    {queueDetails.waiting?.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', marginTop: '12px' }}>
                                            {queueDetails.waiting.map((app, index) => (
                                                <div key={app._id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '12px 16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                                }}>
                                                    <span style={{ fontWeight: '600', color: '#f8fafc' }}>
                                                        #{app.tokenNumber} — {app.patientId?.name || 'Unknown'}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                                                            Position {index + 1}
                                                        </span>
                                                        {index > 0 && (
                                                            <button
                                                                onClick={() => handleEmergencyOverride(app._id)}
                                                                style={{
                                                                    padding: '6px 12px', background: '#dc2626',
                                                                    color: 'white', border: 'none', borderRadius: '6px',
                                                                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                                                                    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                🚨 Emergency
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>No patients waiting.</p>
                                    )}

                                    {queueDetails.skipped?.length > 0 && (
                                        <>
                                            <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginTop: '20px', color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>⏭️ Skipped Patients ({queueDetails.skipped?.length || 0})</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                {queueDetails.skipped.map((app) => (
                                                    <div key={app._id} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '12px 16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.3)',
                                                        border: '1px solid rgba(255, 255, 255, 0.04)', opacity: 0.8
                                                    }}>
                                                        <span style={{ fontWeight: '600', color: '#94a3b8' }}>
                                                            #{app.tokenNumber} — {app.patientId?.name || 'Unknown'}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#fb923c', fontWeight: '600' }}>No-show</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>}

            {showCheckoutModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(3, 7, 18, 0.6)', backdropFilter: 'blur(6px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#0f172a', borderRadius: '12px', padding: '30px',
                        maxWidth: '500px', width: '90%', textAlign: 'left',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', color: '#cbd5e1',
                        border: '1px solid rgba(13, 213, 195, 0.2)'
                    }}>
                        <h2 style={{ margin: '0 0 10px 0', color: '#0dd5c3', fontWeight: '700' }}>Complete Appointment</h2>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
                            Write a digital prescription and attach documents before marking the patient's visit as complete.
                        </p>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px' }}>
                                💊 Prescription / Medications
                            </label>
                            <textarea
                                value={prescriptionText}
                                onChange={e => setPrescriptionText(e.target.value)}
                                placeholder="Enter dosage, medicines, and advice..."
                                style={{
                                    width: '100%', minHeight: '120px', padding: '10px', borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    color: '#f8fafc', fontSize: '14px', fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px' }}>
                                🔗 Document URL (optional)
                            </label>
                            <input
                                type="text"
                                value={prescriptionUrl}
                                onChange={e => setPrescriptionUrl(e.target.value)}
                                placeholder="https://example.com/prescription.pdf"
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    color: '#f8fafc', fontSize: '14px', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                style={{
                                    padding: '10px 20px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1',
                                    border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => checkOut(queueID)}
                                style={{
                                    padding: '10px 20px', background: 'linear-gradient(135deg, #0dd5c3 0%, #0284c7 100%)', color: '#0f172a',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                ✅ Complete Visit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Doctordash;