import { useEffect, useState } from "react";
import styles from './doctor.module.css';
import API from "../api";
import Menubar from '../utils.jsx/menubar';
import Menubutton from '../utils.jsx/menubutton';

function Daily(){
    const [doctor, setDoctor] = useState(null);
    const [capacity, setCapacity] = useState(0);
    const [staffId, setStaffId] = useState("");
    const [queueId, setQueueId] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("loading");
    const [loading, setLoading] = useState(false);
    const [toggle, setToggle] = useState(false);

    async function authdoc() {
        try{
            const res = await API.get("/doctor/me");
            setDoctor(res.data.d);
            setCapacity(res.data.d.dailyCapacity || 0);
            setStatus("display");
        }
        catch(err){
            console.error("Doctor auth failed", err);
            setStatus("none");
        }
    }

    async function fetchCurrentQueue(docId){
        if(!docId) return;
        try {
            const qres = await API.get(`/patients/getQueuesByDId/${docId}`);
            if(qres.data && qres.data.found) {
                setQueueId(qres.data.queueId);
            } else {
                setQueueId("");
            }
        } catch(err) {
            console.error("Could not fetch queue", err);
            setQueueId("");
        }
    }

    useEffect(()=>{
        authdoc();
    },[]);

    useEffect(()=>{
        if (doctor && doctor._id) {
            fetchCurrentQueue(doctor._id);
        }
    }, [doctor]);

    async function setSlot(e){
        e.preventDefault();
        if(!doctor?._id){
            setError("Doctor profile not loaded yet.");
            return;
        }

        const capNumber = Number(capacity);
        if(isNaN(capNumber) || capNumber <= 0){
            setError("Please enter a valid positive capacity.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try{
            await API.put("/doctor/setCapacity", { doctorId: doctor._id, capacity: capNumber });

            const res = await API.post("/doctor/createQueue", {
                doctorId: doctor._id,
                staffId: staffId || "69bcc92f382eae4dba9daa09",
                capacity: capNumber
            });

            setQueueId(res.data.queueId || "");
            setMessage(res.data.msg || "Queue created successfully.");

            // refresh status from backend
            await fetchCurrentQueue(doctor._id);
        } catch(e){
            console.error(e);
            setError(e.response?.data?.msg || e.response?.data?.error || e.message || "Failed to create queue.");
        } finally {
            setLoading(false);
        }
    }

    let menu = [
        { name: "Dashboard", path: "/doctor/dash" },
        { name: "Profile", path: "/doctor/profile" },
        { name: "Set Daily Limits", path: "/doctor/dailycapacity" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    return (
        <div>
            {status === "loading" && <h2>loading...</h2>}
            {status === "none" && <h2>Unable to load doctor data.</h2>}
            {status === "display" &&
                <div style={{ minHeight: '100vh' }} className={styles.outer}>
                    <header style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '50px', backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 20px' }}>
                        <Menubutton togglemenu={() => setToggle(!toggle)} button={styles.button}></Menubutton>
                        <h2 style={{ margin: '0px', color: '#ffffff', fontSize: '16px', fontWeight: '800', letterSpacing: '0.05em' }}>DAILY LIMITS</h2>
                        <span></span>
                    </header>
                    <div>
                        {toggle && <Menubar menus={menu} color={styles.menubar}></Menubar>}
                        <div className={styles.container}>
                            <h2>Daily Queue Settings</h2>
                            
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
                                {/* Left Info Card */}
                                <div className={styles.card} style={{ flex: '1 1 350px', height: 'auto', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: 0, color: '#ffffff' }}>Clinic Status</h3>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Doctor Name</span>
                                            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#ffffff' }}>Dr. {doctor?.name || "Unknown"}</p>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Current Capacity Limit</span>
                                            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#0dd5c3' }}>{doctor?.dailyCapacity || "Not set"}</p>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Active Queue ID</span>
                                            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '14px', color: queueId ? '#34d399' : '#f43f5e', fontFamily: 'monospace' }}>
                                                {queueId || "No queue active today"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Form Card */}
                                <div className={styles.card} style={{ flex: '1 1 350px', height: 'auto', padding: '24px', boxSizing: 'border-box' }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#ffffff', alignSelf: 'flex-start' }}>Set Limits</h3>
                                    <form onSubmit={setSlot} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '14px' }}>Daily Patient Limit (1-100)</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={capacity}
                                                onChange={(e)=>{setCapacity(e.target.value)}}
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                                required
                                            />
                                        </label>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '14px' }}>Staff ID (optional)</span>
                                            <input
                                                type="text"
                                                value={staffId}
                                                onChange={(e)=>{setStaffId(e.target.value)}}
                                                placeholder="Enter staff objectId"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                            />
                                        </label>

                                        {message && <p style={{ margin: 0, padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>{message}</p>}
                                        {error && <p style={{ margin: 0, padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>{error}</p>}

                                        <button type='submit' style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                                            {loading ? 'Saving...' : 'Save & Initialize Queue'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

export default Daily;
