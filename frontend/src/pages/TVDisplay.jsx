import { useEffect, useState, useRef } from "react";
import API from "../api";

function TVDisplay() {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const lastAnnounced = useRef({}); 

    async function fetchDisplayData() {
        try {
            const res = await API.get("/patients/live-display");
            const activeQueues = res.data.queues || [];
            setQueues(activeQueues);
            
            
            activeQueues.forEach(q => {
                if (q.currentPatient && q.currentPatient._id) {
                    const docId = q.doctorId?._id;
                    const prevPatientId = lastAnnounced.current[docId];
                    if (prevPatientId !== q.currentPatient._id) {
                        announcePatient(q.currentPatient.tokenNumber, q.doctorId?.name);
                        lastAnnounced.current[docId] = q.currentPatient._id;
                    }
                }
            });
        } catch (err) {
            console.error("Error fetching display data:", err);
        } finally {
            setLoading(false);
        }
    }

    function announcePatient(tokenNumber, doctorName) {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel(); 
            const text = `Token number ${tokenNumber}, please proceed to Doctor ${doctorName}'s room.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9; 
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    useEffect(() => {
        fetchDisplayData();
        const interval = setInterval(fetchDisplayData, 3000);
        return () => {
            clearInterval(interval);
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    if (loading) {
        return (
            <div style={{
                height: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
                backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "'Outfit', sans-serif"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "10px" }}>Loading TV Display...</div>
                    <div style={{ fontSize: "14px", color: "#94a3b8" }}>Connecting to live queue data stream</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc",
            fontFamily: "'Outfit', 'Inter', sans-serif", padding: "30px", boxSizing: "border-box"
        }}>
            {}
            <header style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "2px solid #1e293b", paddingBottom: "20px", marginBottom: "30px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <span style={{ fontSize: "40px" }}>🏥</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>SmartCare Waiting Room</h1>
                        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#38bdf8", fontWeight: "600" }}>LIVE QUEUE TV BOARD</p>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1e293b", padding: "10px 18px", borderRadius: "30px" }}>
                    <span style={{ width: "10px", height: "10px", backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#cbd5e1" }}>CONNECTED REAL-TIME</span>
                </div>
            </header>

            {}
            {queues.length === 0 ? (
                <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ textShadow: "0 0 20px rgba(56, 189, 248, 0.2)", color: "#94a3b8", fontSize: "20px" }}>
                        No active outpatient clinics running right now.
                    </div>
                </div>
            ) : (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                    gap: "24px"
                }}>
                    {queues.map(q => {
                        const inRoomToken = q.currentPatient?.tokenNumber || "—";
                        const inRoomName = q.currentPatient?.patientId?.name || "No Patient";
                        const topWaiting = q.waiting?.slice(0, 3) || [];

                        return (
                            <div key={q._id} style={{
                                backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "16px",
                                overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                                transition: "all 0.3s"
                            }}>
                                {}
                                <div style={{
                                    background: q.status === "PAUSED" 
                                        ? "linear-gradient(90deg, #b45309 0%, #d97706 100%)" 
                                        : "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)",
                                    padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center"
                                }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>Dr. {q.doctorId?.name || "N/A"}</h3>
                                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.8, textTransform: "uppercase", fontWeight: "bold" }}>
                                            {q.departmentId?.name || "N/A"}
                                        </p>
                                    </div>
                                    <span style={{
                                        backgroundColor: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "20px",
                                        fontSize: "12px", fontWeight: "bold"
                                    }}>
                                        {q.status}
                                    </span>
                                </div>

                                {}
                                <div style={{
                                    padding: "24px", borderBottom: "1px solid #334155", textAlign: "center",
                                    background: "rgba(30, 41, 59, 0.4)"
                                }}>
                                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#38bdf8", fontWeight: "700", letterSpacing: "1px" }}>
                                        CURRENTLY IN DOCTOR'S ROOM
                                    </p>
                                    <div style={{
                                        fontSize: "72px", fontWeight: "900", color: q.status === "PAUSED" ? "#f59e0b" : "#10b981",
                                        margin: "10px 0", textShadow: `0 0 30px ${q.status === "PAUSED" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                                    }}>
                                        TOKEN {inRoomToken}
                                    </div>
                                    <div style={{ fontSize: "16px", color: "#e2e8f0", fontWeight: "600" }}>
                                        {inRoomName}
                                    </div>
                                </div>

                                {/* Upcoming Waiting Section */}
                                <div style={{ padding: "20px" }}>
                                    <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#94a3b8", fontWeight: "700", letterSpacing: "0.5px" }}>
                                        NEXT IN LINE (WAITING)
                                    </p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {topWaiting.map((item, idx) => (
                                            <div key={item._id || idx} style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                                background: "rgba(15, 23, 42, 0.3)", padding: "12px 16px", borderRadius: "8px",
                                                border: "1px solid rgba(51, 65, 85, 0.5)"
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <span style={{
                                                        backgroundColor: "#3b82f6", color: "white", padding: "4px 8px",
                                                        borderRadius: "6px", fontSize: "12px", fontWeight: "bold"
                                                    }}>
                                                        #{item.tokenNumber}
                                                    </span>
                                                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#cbd5e1" }}>
                                                        {item.patientId?.name || "Patient"}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700" }}>
                                                    Position {idx + 1}
                                                </span>
                                            </div>
                                        ))}

                                        {topWaiting.length === 0 && (
                                            <div style={{
                                                padding: "16px", textAlign: "center", color: "#64748b",
                                                fontSize: "14px", fontStyle: "italic"
                                            }}>
                                                No patients waiting in queue.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Embed Pulsing CSS Animation */}
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.7; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
}

export default TVDisplay;
