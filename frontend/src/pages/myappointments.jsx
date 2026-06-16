import API from "../api";
import { useEffect, useState } from "react";
import Menubar from "../utils.jsx/menubar.jsx";
import styles from "./patients.module.css";

function MyAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patientId, setPatientId] = useState(null);

    const menus = [
        { name: "Home", path: "/patient/dash" },
        { name: "Book Appointment", path: "/patient/book" },
        { name: "Profile", path: "/patient/profile" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            try {
                let res = await API.get("/patients/getPatientById/me");
                if (!isMounted) return;

                const pId = res.data.p._id;
                setPatientId(pId);

                try {
                    let historyRes = await API.get(`/patients/getPatientHistory/${pId}`);
                    if (isMounted && historyRes.data && historyRes.data.bookings) {
                        setAppointments(historyRes.data.bookings);
                    }
                } catch (historyErr) {
                    console.error("Error loading patient history:", historyErr);
                }
            } catch (err) {
                console.error("Error loading patient", err);
                if (err.response?.status === 401) {
                    localStorage.clear();
                    window.location.href = "/patient/login";
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    const getStatusClassName = (status) => {
        switch (status) {
            case 'COMPLETED': return styles.statusCompleted;
            case 'WAITING': return styles.statusWaiting;
            case 'IN_ROOM': return styles.statusInRoom;
            case 'SKIPPED': return styles.statusSkipped;
            case 'CANCELLED': return styles.statusCancelled;
            default: return '';
        }
    };

    const getDoctorStatusIcon = (status) => {
        switch (status) {
            case 'available': return '🟢 available';
            case 'offline': return '🔴 offline';
            case 'emergency': return '🚨 emergency';
            case 'break': return '⏸️ break';
            case 'inroom': return '👨‍⚕️ in room';
            default: return '';
        }
    };

    const handleCancelAppointment = async (appId) => {
        if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
        try {
            await API.post(`/patients/removeAppointment/${appId}`);
            setAppointments(appointments.filter(app => app._id !== appId));
            alert("Appointment cancelled successfully");
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            alert("Failed to cancel appointment");
        }
    };

    const viewReceipt = (appointment) => {
        const doctorName = appointment.doctorId?.name || 'N/A';
        const deptName = appointment.departmentId?.name || 'N/A';
        const amount = appointment.paymentId?.amount || 500;
        const paymentStatus = appointment.paymentId?.status || 'PAID';
        const bookedDate = new Date(appointment.bookedAt);

        const receiptHTML = `<!DOCTYPE html><html><head><title>Payment Receipt</title>
<style>
body { font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 40px auto; padding: 30px; }
.header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 24px; }
.header h1 { color: #667eea; margin: 0; font-size: 28px; }
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
<div class="row"><span class="label">Doctor</span><span class="value">Dr. ${doctorName}</span></div>
<div class="row"><span class="label">Department</span><span class="value">${deptName}</span></div>
<div class="row"><span class="label">Token Number</span><span class="value">#${appointment.tokenNumber || 'N/A'}</span></div>
<div class="row"><span class="label">Appointment ID</span><span class="value" style="font-size:11px">${appointment._id}</span></div>
<div class="row"><span class="label">Booked On</span><span class="value">${bookedDate.toLocaleDateString('en-IN')} ${bookedDate.toLocaleTimeString('en-IN')}</span></div>
<div class="total"><p style="color:#666;margin:0 0 6px 0">Amount Paid</p><div class="amount">₹${amount}</div><p style="color:#2e7d32;margin:6px 0 0 0;font-weight:600">✅ ${paymentStatus}</p></div>
${appointment.qrCode ? `<div class="qr"><img src="${appointment.qrCode}" /></div>` : ''}
<div class="footer"><p>Thank you for choosing SmartCareQ</p></div>
</body></html>`;

        const w = window.open('', '_blank');
        w.document.write(receiptHTML);
        w.document.close();
    };

    if (loading) {
        return (
            <div className={styles.patientContainer}>
                <div className={styles.contentWrapper}>
                    <Menubar menus={menus} color="blue" />
                    <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>Loading appointments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.patientContainer}>
            <div className={styles.contentWrapper}>
                <Menubar menus={menus} color="blue" />

                <div className={styles.mainContent}>
                    <h1 className={styles.pageTitle}>My Appointments</h1>

                    {appointments.length === 0 ? (
                        <div className={styles.noAppointmentsMessage}>
                            You have no appointments yet. <a href="/patient/book" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}>Book one now</a>.
                        </div>
                    ) : (
                        <div className={styles.appointmentsList}>
                            {appointments.map(appointment => (
                                <div
                                    key={appointment._id}
                                    className={styles.appointmentItem}
                                >
                                    <div className={styles.appointmentHeader}>
                                        <h3 className={styles.appointmentID}>Appointment #{appointment._id.slice(-6)}</h3>
                                        <span className={`${styles.statusBadge} ${getStatusClassName(appointment.status)}`}>
                                            {appointment.status}
                                        </span>
                                    </div>

                                    <div className={styles.appointmentGrid}>
                                        <div className={styles.detailItem}>
                                            <strong>Doctor:</strong>
                                            <div>
                                                {appointment.doctorId?.name || appointment.doctorId || 'N/A'}
                                                {appointment.doctorId?.status && (
                                                    <div style={{marginTop:'4px', fontSize:'12px', fontWeight:'500'}}>
                                                        {getDoctorStatusIcon(appointment.doctorId.status)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <strong>Department:</strong>
                                            {appointment.departmentId?.name || appointment.departmentId || 'N/A'}
                                        </div>
                                        <div className={styles.detailItem}>
                                            <strong>Date:</strong>
                                            {new Date(appointment.bookedAt).toLocaleDateString()}
                                        </div>
                                        <div className={styles.detailItem}>
                                            <strong>Token:</strong>
                                            {appointment.tokenNumber || 'N/A'}
                                        </div>
                                    </div>

                                    {appointment.expectedTime && (
                                        <div className={`${styles.detailItem} ${styles.appointmentGridFull}`}>
                                            <strong>Expected Time:</strong>
                                            {new Date(appointment.expectedTime).toLocaleTimeString()}
                                        </div>
                                    )}

                                    {appointment.paymentId && (
                                        <div className={`${styles.detailItem} ${styles.appointmentGridFull}`}>
                                            <strong>Payment:</strong>
                                            {appointment.paymentId.status} - ₹{appointment.paymentId.amount}
                                        </div>
                                    )}

                                    {appointment.qrCode && (
                                        <div className={`${styles.detailItem} ${styles.appointmentGridFull}`}>
                                            <strong>QR Code:</strong>
                                            <div style={{marginTop:'10px'}}>
                                                <img src={appointment.qrCode} alt="Appointment QR" style={{width:'140px',height:'140px',border:'1px solid #ddd',padding:'4px',borderRadius:'8px'}} />
                                            </div>
                                        </div>
                                    )}

                                    {}
                                    {appointment.status === 'COMPLETED' && (appointment.prescriptionText || appointment.prescriptionUrl) && (
                                        <div style={{
                                            marginTop: '14px', padding: '16px', borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
                                            border: '2px solid #81c784'
                                        }}>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '15px' }}>
                                                💊 Prescription & Reports
                                            </h4>
                                            {appointment.prescriptionText && (
                                                <div style={{
                                                    background: 'white', padding: '12px', borderRadius: '8px',
                                                    fontSize: '14px', color: '#333', lineHeight: '1.6',
                                                    border: '1px solid #c8e6c9', whiteSpace: 'pre-wrap',
                                                    marginBottom: appointment.prescriptionUrl ? '10px' : '0'
                                                }}>
                                                    {appointment.prescriptionText}
                                                </div>
                                            )}
                                            {appointment.prescriptionUrl && (
                                                <a
                                                    href={appointment.prescriptionUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '8px 16px', backgroundColor: '#2e7d32',
                                                        color: 'white', border: 'none', borderRadius: '6px',
                                                        cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    📥 Download Prescription Document
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {appointment.status === 'WAITING' && (
                                        <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                                            <button
                                                onClick={() => handleCancelAppointment(appointment._id)}
                                                style={{
                                                    padding:'8px 16px', backgroundColor:'#ef4444',
                                                    color:'white', border:'none', borderRadius:'6px',
                                                    cursor:'pointer', fontSize:'14px', fontWeight:'600'
                                                }}
                                            >
                                                Cancel Appointment
                                            </button>
                                            <button
                                                onClick={() => viewReceipt(appointment)}
                                                style={{
                                                    padding:'8px 16px', backgroundColor:'#1565c0',
                                                    color:'white', border:'none', borderRadius:'6px',
                                                    cursor:'pointer', fontSize:'14px', fontWeight:'600'
                                                }}
                                            >
                                                🧾 View Receipt
                                            </button>
                                        </div>
                                    )}
                                    {appointment.status !== 'WAITING' && (
                                        <div style={{marginTop:'15px'}}>
                                            <button
                                                onClick={() => viewReceipt(appointment)}
                                                style={{
                                                    padding:'8px 16px', backgroundColor:'#1565c0',
                                                    color:'white', border:'none', borderRadius:'6px',
                                                    cursor:'pointer', fontSize:'14px', fontWeight:'600'
                                                }}
                                            >
                                                🧾 View Receipt
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MyAppointments;