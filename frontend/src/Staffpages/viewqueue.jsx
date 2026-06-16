import { useEffect, useState } from "react";
import API from "../api";
import styles from "./staffs.module.css";
import Menubar from "../utils.jsx/menubar";

let menus = [
    { name: "Staff Dashboard", path: "/staff/dash" },
    { name: "Update Profile", path: "/staff/profile" },
    { name: "📺 TV Display Board", path: "/tv-display" }
];

function ViewQueue() {
    let [show, toggleshow] = useState(false);
    let [queues, setQueues] = useState([]);
    let [loading, setLoading] = useState(true);

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
        } finally {
            setLoading(false);
        }
    }
    async function handleEmergencyOverride(queueId, appointmentId) {
        if (!window.confirm("Are you sure you want to flag this appointment as an EMERGENCY override? This will move them to Position 1.")) return;
        try {
            await API.post("/staff/emergencyOverride", { queueId, appointmentId });
            alert("🚨 Emergency override successful. Patient moved to Position 1.");
            fetchQueues();
        } catch (err) {
            console.error("Emergency override error:", err);
            alert("Error: " + (err.response?.data?.msg || err.message));
        }
    }

    useEffect(() => {
        fetchQueues();
        const interval = setInterval(fetchQueues, 3000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN': return '#4caf50';
            case 'PAUSED': return '#ff9800';
            case 'CLOSED': return '#f44336';
            default: return '#999';
        }
    };

    const getAppointmentStatusStyle = (status) => {
        switch (status) {
            case 'WAITING': return { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' };
            case 'IN_ROOM': return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
            case 'SKIPPED': return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' };
            case 'COMPLETED': return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
            default: return { background: '#f5f5f5', color: '#555', border: '1px solid #ddd' };
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <h2 style={{ color: '#2c3e50' }}>Loading queue data...</h2>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{ minHeight: '100vh' }}>
            <button onClick={() => toggleshow(!show)}
                style={{ borderRadius: '5px', border: 'none', width: '8ch', height: '8vh', position: 'fixed', top: '0px', left: '0px', cursor: 'pointer', fontSize: '18px', zIndex: 100 }}>
                ═
            </button>
            {show && <Menubar menus={menus} color={styles.Menu} />}

            <h2 style={{ color: '#ffffff', marginBottom: '8px' }}>📋 Live Queue View</h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Auto-refreshes every 3 seconds</p>

            {queues.length === 0 ? (
                <div style={{
                    background: 'rgba(17, 24, 39, 0.75)', padding: '40px', borderRadius: '12px',
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)',
                    textAlign: 'center', maxWidth: '500px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Queues Assigned</h3>
                    <p style={{ color: '#94a3b8', margin: 0 }}>You have not been assigned to any queue for today.</p>
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {queues.map(q => {
                        const queue = q.queueId;
                        const doctor = q.doctorId;
                        const waitingList = queue?.waiting || [];
                        const skippedList = queue?.skipped || [];
                        const currentPatient = queue?.currentPatient;

                        return (
                            <div key={q._id} style={{
                                background: 'rgba(17, 24, 39, 0.75)', borderRadius: '12px', padding: '24px',
                                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderLeft: `5px solid ${getStatusColor(queue?.status)}`
                            }}>
                                {}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', color: '#ffffff' }}>
                                            👨‍⚕️ Dr. {doctor?.name || 'N/A'}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                                            Queue ID: {queue?._id?.slice(-8) || 'N/A'}
                                        </p>
                                    </div>
                                    <span className={`${styles.statusBadge} statusBadge`} style={{
                                        padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px',
                                        background: getStatusColor(queue?.status) + '22',
                                        color: getStatusColor(queue?.status),
                                        border: `1px solid ${getStatusColor(queue?.status)}`
                                    }}>
                                        {queue?.status || 'N/A'}
                                    </span>
                                </div>

                                {}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '100px', background: '#e3f2fd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>{waitingList.length}</div>
                                        <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: '600' }}>⏳ Waiting</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '100px', background: '#fff3e0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>{skippedList.length}</div>
                                        <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600' }}>⏭️ Skipped</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '100px', background: currentPatient ? '#e8f5e9' : '#f5f5f5', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentPatient ? '#2e7d32' : '#999' }}>
                                            {currentPatient ? '1' : '0'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: currentPatient ? '#2e7d32' : '#999', fontWeight: '600' }}>🩺 In Room</div>
                                    </div>
                                </div>

                                {}
                                {currentPatient && (
                                    <div style={{
                                        background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px',
                                        marginBottom: '12px', border: '1px solid #a5d6a7'
                                    }}>
                                        <strong style={{ color: '#2e7d32' }}>🩺 Currently In Room:</strong>{' '}
                                        <span style={{ fontWeight: '600' }}>
                                            #{currentPatient.tokenNumber} — {currentPatient.patientId?.name || 'Unknown'}
                                        </span>
                                    </div>
                                )}

                                {}
                                {waitingList.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '14px' }}>⏳ Waiting Queue:</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {waitingList.map((app, i) => (
                                                <div key={app._id || i} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '8px 12px', borderRadius: '6px',
                                                    ...getAppointmentStatusStyle('WAITING')
                                                }}>
                                                    <span style={{ fontWeight: '600' }}>
                                                        #{app.tokenNumber} — {app.patientId?.name || 'Unknown'}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                                            Position {i + 1}
                                                        </span>
                                                        {i > 0 && (
                                                            <button
                                                                onClick={() => handleEmergencyOverride(queue._id, app._id)}
                                                                style={{
                                                                    padding: '4px 8px', backgroundColor: '#e74c3c',
                                                                    color: 'white', border: 'none', borderRadius: '4px',
                                                                    cursor: 'pointer', fontSize: '11px', fontWeight: 'bold',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                                onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                                                                onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                                                            >
                                                                🚨 Emergency
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {}
                                {skippedList.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#e65100', fontSize: '14px' }}>⏭️ Skipped:</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {skippedList.map((app, i) => (
                                                <div key={app._id || i} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '8px 12px', borderRadius: '6px',
                                                    ...getAppointmentStatusStyle('SKIPPED')
                                                }}>
                                                    <span style={{ fontWeight: '600' }}>
                                                        #{app.tokenNumber} — {app.patientId?.name || 'Unknown'}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: '500' }}>No-show</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {waitingList.length === 0 && skippedList.length === 0 && !currentPatient && (
                                    <p style={{ color: '#94a3b8', textAlign: 'center', margin: '8px 0 0 0', fontSize: '14px' }}>
                                        No patients in this queue yet.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ViewQueue;
