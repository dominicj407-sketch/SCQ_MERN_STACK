import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import Menubar from "../utils.jsx/menubar.jsx";
import styles from "./patients.module.css";

function Patientdashboard() {
    let [patientname, setpatient] = useState("");
    let [loading, setloading] = useState(true);
    let [currentAppointment, setCurrentAppointment] = useState(null);
    let [liveQueue, setLiveQueue] = useState(null);
    let [patientId, setPatientId] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(null);

    const formatSeconds = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        const queuePaused = liveQueue?.queueStatusObj?.status === 'PAUSED' || currentAppointment?.queueStatus === 'PAUSED';
        const expectedTimeStr = currentAppointment?.expectedTime || currentAppointment?.appointment?.expectedTime;
        
        if (!currentAppointment || currentAppointment.position <= 0 || !expectedTimeStr || queuePaused) {
            setSecondsLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const expectedTime = new Date(expectedTimeStr).getTime();
            const remaining = Math.max(0, Math.floor((expectedTime - Date.now()) / 1000));
            setSecondsLeft(remaining);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [currentAppointment?.position, currentAppointment?.expectedTime, currentAppointment?.appointment?.expectedTime, liveQueue?.queueStatusObj?.status, currentAppointment?.queueStatus]);

    const location = useLocation();

    const menus = [
        { name: "My Appointments", path: "/patient/appointments" },
        { name: "Book Appointment", path: "/patient/book" },
        { name: "Profile", path: "/patient/profile" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    const quotes = [
        "Your health is your wealth.",
        "Take care of your body. It's the only place you have to live.",
        "Health is not valued till sickness comes.",
        "The first wealth is health."
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    // Handle Google OAuth redirect token
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        if (token) {
            localStorage.setItem('accessToken', token);
            localStorage.setItem('role', 'Patient');
            window.history.replaceState({}, document.title, '/patient/dash');
        }
    }, []);

    // Consolidated Initial Load: Patient Info + Active Appointment
    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            try {
                // 1. Fetch Patient Info
                let res = await API.get("/patients/getPatientById/me");
                if (!isMounted) return;
                
                const p = res.data.p;
                setpatient(p.name);
                setPatientId(p._id);

                // 2. Fetch Active Appointment immediately
                try {
                    let appRes = await API.get("/patients/getAppointments");
                    if (!isMounted) return;

                    if (appRes.data.found && appRes.data.appointments) {
                        const active = appRes.data.appointments.find(
                            a => a.status === 'WAITING' || a.status === 'IN_ROOM' || a.status === 'BOOKED'
                        );

                        if (active) {
                            let posRes = await API.get(`/patients/getPosition/${active._id}`);
                            let detailRes = await API.get(`/patients/getAppointment/${active._id}`);

                            if (!isMounted) return;

                            const appointment = detailRes.data.found ? detailRes.data.appointment : active;
                            const position = posRes.data.found ? posRes.data : {};

                            setCurrentAppointment({
                                ...active,
                                appointment,
                                position: position.position || 0,
                                currentPatient: position.currentPatient || false,
                                waitingPatient: position.waitingPatient || false,
                                skippedPatient: position.skippedPatient || false,
                                waitingSince: position.waitingSince || null,
                                queueStatus: position.queueStatus || null
                            });

                            if (active.doctorId) {
                                const doctorId = typeof active.doctorId === 'object' ? active.doctorId._id || active.doctorId : active.doctorId;
                                try {
                                    let qRes = await API.get(`/patients/getLiveQueue/${doctorId}`);
                                    if (isMounted && qRes.data.found) {
                                        try {
                                            let qStatusRes = await API.get(`/patients/getQueueStatus/${qRes.data.queueId}`);
                                            if (isMounted) {
                                                setLiveQueue({
                                                    ...qRes.data,
                                                    queueStatusObj: qStatusRes.data.queue || null
                                                });
                                            }
                                        } catch {
                                            if (isMounted) setLiveQueue(qRes.data);
                                        }
                                    }
                                } catch (e) {
                                    console.log("No live queue data");
                                }
                            }
                        } else {
                            setCurrentAppointment(null);
                            setLiveQueue(null);
                        }
                    } else {
                        setCurrentAppointment(null);
                        setLiveQueue(null);
                    }
                } catch (appErr) {
                    console.error("Error fetching initial active appointment:", appErr);
                }
            } catch (err) {
                console.error("Error during patient dashboard initial load:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    localStorage.clear();
                    window.location.href = "/patient/login";
                }
            } finally {
                if (isMounted) {
                    setloading(false);
                }
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Polling Effect: Periodically update active appointment & queue info in background
    useEffect(() => {
        if (!patientId) return;

        const fetchCurrentAppointment = async () => {
            try {
                let res = await API.get("/patients/getAppointments");
                if (res.data.found && res.data.appointments) {
                    const active = res.data.appointments.find(
                        a => a.status === 'WAITING' || a.status === 'IN_ROOM' || a.status === 'BOOKED'
                    );

                    if (active) {
                        let posRes = await API.get(`/patients/getPosition/${active._id}`);
                        let appRes = await API.get(`/patients/getAppointment/${active._id}`);

                        const appointment = appRes.data.found ? appRes.data.appointment : active;
                        const position = posRes.data.found ? posRes.data : {};

                        setCurrentAppointment({
                            ...active,
                            appointment,
                            position: position.position || 0,
                            currentPatient: position.currentPatient || false,
                            waitingPatient: position.waitingPatient || false,
                            skippedPatient: position.skippedPatient || false,
                            waitingSince: position.waitingSince || null,
                            queueStatus: position.queueStatus || null
                        });

                        if (active.doctorId) {
                            const doctorId = typeof active.doctorId === 'object' ? active.doctorId._id || active.doctorId : active.doctorId;
                            try {
                                let qRes = await API.get(`/patients/getLiveQueue/${doctorId}`);
                                if (qRes.data.found) {
                                    try {
                                        let qStatusRes = await API.get(`/patients/getQueueStatus/${qRes.data.queueId}`);
                                        setLiveQueue({
                                            ...qRes.data,
                                            queueStatusObj: qStatusRes.data.queue || null
                                        });
                                    } catch {
                                        setLiveQueue(qRes.data);
                                    }
                                }
                            } catch (e) {
                                console.log("No live queue data");
                            }
                        }
                    } else {
                        setCurrentAppointment(null);
                        setLiveQueue(null);
                    }
                }
            } catch (err) {
                console.error("Error polling current appointment status:", err);
            }
        };

        const interval = setInterval(fetchCurrentAppointment, 5000);
        return () => clearInterval(interval);
    }, [patientId]);

    if (loading) {
        return <p>Loading...</p>;
    }

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const queuePaused = liveQueue?.queueStatusObj?.status === 'PAUSED';

    return (
        <div className={styles.patientContainer}>
            <div className={styles.contentWrapper}>
                <Menubar menus={menus} color="blue" />

                <div className={styles.mainContent}>
                    <div className={styles.greetingSection}>
                        <h1 className={styles.greetingTitle}>{getGreeting()}, {patientname}!</h1>
                        <p className={styles.quoteText}>"{randomQuote}"</p>
                    </div>

                    {currentAppointment ? (
                        <div className={`${styles.appointmentCard} ${styles.appointmentCardActive}`}>
                            <h2 className={styles.appointmentTitle}>Current Appointment</h2>

                            {/* Queue status banner */}
                            {queuePaused && (
                                <div style={{
                                    padding: '10px 16px', borderRadius: '8px', marginBottom: '12px',
                                    background: '#fff3cd', border: '1px solid #ffc107', color: '#856404',
                                    fontWeight: '600', fontSize: '14px', textAlign: 'center'
                                }}>
                                    ⏸️ Queue is currently PAUSED — Timer stopped. Please wait for the doctor to resume.
                                </div>
                            )}

                            <div className={styles.appointmentDetails}>
                                <div className={styles.appointmentDetail}>
                                    <strong>Doctor</strong>
                                    {currentAppointment.appointment?.doctorId?.name || 'N/A'}
                                </div>
                                <div className={styles.appointmentDetail}>
                                    <strong>Status</strong>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                                        background: currentAppointment.currentPatient ? '#e8f5e9' :
                                            currentAppointment.status === 'WAITING' ? '#e3f2fd' :
                                                currentAppointment.skippedPatient ? '#fff3e0' : '#f5f5f5',
                                        color: currentAppointment.currentPatient ? '#2e7d32' :
                                            currentAppointment.status === 'WAITING' ? '#1565c0' :
                                                currentAppointment.skippedPatient ? '#e65100' : '#555'
                                    }}>
                                        {currentAppointment.currentPatient ? '🩺 IN ROOM' : currentAppointment.status}
                                    </span>
                                </div>
                                <div className={styles.appointmentDetail}>
                                    <strong>Token #</strong>
                                    {currentAppointment.tokenNumber || currentAppointment.appointment?.tokenNumber || 'N/A'}
                                </div>
                                <div className={styles.appointmentDetail}>
                                    <strong>Your Position</strong>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: currentAppointment.currentPatient ? '#2e7d32' : '#1565c0' }}>
                                        {currentAppointment.currentPatient ? '🩺 Your turn!' : `#${currentAppointment.position}`}
                                    </span>
                                </div>
                            </div>

                            {currentAppointment.currentPatient && (
                                <p className={styles.currentMessage}>🎉 You are currently being seen by the doctor!</p>
                            )}

                            {/* Live Queue Info */}
                            {liveQueue && !currentAppointment.currentPatient && (
                                <div style={{
                                    marginTop: '16px', padding: '16px', borderRadius: '10px',
                                    background: queuePaused ? '#fffbeb' : '#f0f7ff',
                                    border: `1px solid ${queuePaused ? '#fde68a' : '#bfdbfe'}`
                                }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#2c3e50' }}>📊 Live Queue Info</h3>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1565c0' }}>{liveQueue.waitingCount}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>In Queue</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e65100' }}>
                                                {currentAppointment.expectedTime || currentAppointment.appointment?.expectedTime
                                                    ? `~${Math.max(1, Math.ceil((new Date(currentAppointment.expectedTime || currentAppointment.appointment.expectedTime).getTime() - Date.now()) / 60000))} min`
                                                    : (liveQueue.estimatedWaitMinutes !== undefined ? `~${liveQueue.estimatedWaitMinutes} min` : liveQueue.estimatedWait)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Est. Wait</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#7b1fa2' }}>
                                                {liveQueue.avgConsultTime || 10} min
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Avg Consult</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: queuePaused ? '#856404' : '#2e7d32' }}>
                                                {queuePaused ? '⏸️' : '🟢'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {queuePaused ? 'Paused' : 'Active'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!currentAppointment.currentPatient && currentAppointment.position > 0 && (
                                <div className={styles.appointmentDetail} style={{ marginTop: '12px' }}>
                                    <strong>Estimated Wait Time</strong>
                                    Approximately {
                                        currentAppointment.expectedTime || currentAppointment.appointment?.expectedTime
                                            ? Math.max(1, Math.ceil((new Date(currentAppointment.expectedTime || currentAppointment.appointment.expectedTime).getTime() - Date.now()) / 60000))
                                            : currentAppointment.position * (liveQueue?.avgConsultTime || 10)
                                    } minutes
                                    {liveQueue?.avgConsultTime && (
                                        <span style={{ fontSize: '12px', color: '#888' }}> (based on avg {liveQueue.avgConsultTime} min/patient)</span>
                                    )}
                                </div>
                            )}

                            {secondsLeft !== null && (
                                <div style={{
                                    marginTop: '16px', padding: '16px', borderRadius: '10px',
                                    background: currentAppointment.position === 1 
                                        ? (secondsLeft === 0 ? '#fee2e2' : '#f0fdf4')
                                        : '#f0f7ff',
                                    border: `2px solid ${
                                        currentAppointment.position === 1 
                                            ? (secondsLeft === 0 ? '#f87171' : '#4ade80')
                                            : '#bfdbfe'
                                    }`,
                                    textAlign: 'center'
                                }}>
                                    {currentAppointment.position === 1 ? (
                                        <>
                                            <h3 style={{ margin: '0 0 6px 0', color: secondsLeft === 0 ? '#991b1b' : '#166534', fontSize: '16px', fontWeight: 'bold' }}>
                                                ⏱️ Action Required: Scan QR Code
                                            </h3>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563' }}>
                                                You are NEXT in line! Please scan your QR code at the doctor's room or front desk.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 style={{ margin: '0 0 6px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: 'bold' }}>
                                                ⏱️ Estimated Wait Countdown
                                            </h3>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563' }}>
                                                Estimated time until your consultation begins.
                                            </p>
                                        </>
                                    )}
                                    <div style={{ 
                                        fontSize: '32px', 
                                        fontWeight: '900', 
                                        color: currentAppointment.position === 1 
                                            ? (secondsLeft === 0 ? '#dc2626' : '#15803d')
                                            : '#1d4ed8' 
                                    }}>
                                        {formatSeconds(secondsLeft)}
                                    </div>
                                    {currentAppointment.position === 1 && secondsLeft === 0 && (
                                        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#b91c1c', fontWeight: 'bold' }}>
                                            ⚠️ Time expired! You might be skipped. Please contact staff immediately.
                                        </p>
                                    )}
                                </div>
                            )}

                            {!currentAppointment.currentPatient && (currentAppointment.expectedTime || currentAppointment.appointment?.expectedTime) && (
                                <div className={styles.appointmentDetail} style={{ marginTop: '12px', background: '#e0f2fe', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                    <strong style={{ color: '#0369a1' }}>📅 Expected Consultation Time:</strong> &nbsp;
                                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1' }}>
                                        {new Date(currentAppointment.expectedTime || currentAppointment.appointment?.expectedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`${styles.appointmentCard} ${styles.appointmentCardEmpty}`}>
                            <h2 className={styles.appointmentTitle}>No Active Appointments</h2>
                            <p className={styles.emptyMessage}>You have no active appointments. Book an appointment to get started with your healthcare journey.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Patientdashboard;