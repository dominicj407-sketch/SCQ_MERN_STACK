import { useState, useEffect } from "react";
import styles from "./doctor.module.css";
import API from "../api";
import Menubar from '../utils.jsx/menubar';
import Menubutton from '../utils.jsx/menubutton';

function ProfileEditor() {
    const [doctorData, setDoctorData] = useState({
        name: "Dr. Ravi Kumar",
        phone:"9090909909",
        department: "Cardiology",
        email:"",
        password: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [toggle, setToggle] = useState(false);

    useEffect(() => {
        const fetchDoctorDetails = async () => {
            try {
                const response = await API.get("/doctor/me");
                if (response.data.found) {
                    setDoctorData(prev => ({
                        ...prev,
                        name: response.data.d.name || prev.name,
                        phone: response.data.d.phone || prev.phone,
                        email: response.data.d.email || prev.email,
                        department: response.data.d.departmentId?.name || response.data.d.departmentId || prev.department
                    }));
                }
            } catch (error) {
                console.log("Error fetching doctor details:", error);
            }
        };
        fetchDoctorDetails();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await API.put("/doctor/me", {
                name: doctorData.name,
                phone: doctorData.phone,
                email: doctorData.email,
                password: doctorData.password
            });
            
            if (response.data.found) {
                setMessage("✅ Profile updated successfully!");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("❌ Update failed. Please try again.");
            }
        } catch (error) {
            setMessage("❌ Error: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    let menu = [
        { name: "Dashboard", path: "/doctor/dash" },
        { name: "Profile", path: "/doctor/profile" },
        { name: "Set Daily Limits", path: "/doctor/dailycapacity" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    return (
        <div style={{ minHeight: '100vh' }} className={styles.outer}>
            <header style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '50px', backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 20px' }}>
                <Menubutton togglemenu={() => setToggle(!toggle)} button={styles.button}></Menubutton>
                <h2 style={{ margin: '0px', color: '#ffffff', fontSize: '16px', fontWeight: '800', letterSpacing: '0.05em' }}>EDIT PROFILE</h2>
                <span></span>
            </header>
            <div>
                {toggle && <Menubar menus={menu} color={styles.menubar}></Menubar>}
                <div className={styles.container}>
                    <h2>Edit Profile</h2>
                    <form action="" onSubmit={handleUpdate} className={styles.card} style={{width:'500px', maxWidth:'95%', padding:'30px', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', height:'auto'}}>
                        <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                            <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Name</span>
                            <input type="text" value={doctorData.name} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setDoctorData(prev=>{return {...prev,name:e.target.value}})}}/>
                        </label>
                        <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                            <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Department</span>
                            <input type="text" value={doctorData.department} disabled style={{width:'100%', boxSizing:'border-box', opacity: 0.6, cursor: 'not-allowed'}} />
                        </label>
                        <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                            <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Phone Number</span>
                            <input type="text" value={doctorData.phone} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setDoctorData(prev=>{return {...prev,phone:e.target.value}})}} />
                        </label>
                        <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                            <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Email</span>
                            <input type="text" value={doctorData.email} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setDoctorData(prev=>{return {...prev,email:e.target.value}})}}/>
                        </label>
                        <label htmlFor="password" style={{position: 'relative', width:'100%', display:'flex', flexDirection:'column', gap:'8px'}}>
                            <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Password</span>
                            <input 
                                type={showPassword ? "text" : "password"}
                                style={{width:'100%', boxSizing:'border-box', paddingRight: '45px'}}
                                onChange={(e)=>{setDoctorData(prev=>{return {...prev,password:e.target.value}})}} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '38px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    boxShadow: 'none',
                                    padding: '5px'
                                }}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </label>
                        <p style={{fontSize: '12px', color: '#64748b', marginTop: '0px', width:'100%'}}>🔒 Only you can see your password - admins cannot access it</p>
                        {message && <p style={{marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: message.includes('✅') ? '#34d399' : '#f43f5e', border: `1px solid ${message.includes('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`, width: '100%', boxSizing: 'border-box'}}>{message}</p>}
                        <button type="submit" style={{width:'100%', marginTop: '10px'}} disabled={loading}>{loading ? "Updating..." : "Update Profile"}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProfileEditor;