import { useState, useEffect } from "react";
import styles from "./staffs.module.css";
import API from "../api";
import Menubar from "../utils.jsx/menubar";

function StaffprofileEditor() {
    const [staffData, setstaffData] = useState({
        name: "Dr. Ravi Kumar",
        phone:"9090909909",
        department: "Cardiology",
        email:"",
        password: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [show, toggleshow] = useState(false);

    useEffect(() => {
        const fetchStaffDetails = async () => {
            try {
                const response = await API.get(`/staff/getStaffById/me`);
                if (response.data.found) {
                    const staff = response.data.staff;
                    if (staff.staffId) {
                        localStorage.setItem("staffId", staff.staffId);
                    }
                    setstaffData(prev => ({
                        ...prev,
                        name: staff.name || prev.name,
                        phone: staff.phone || prev.phone,
                        email: staff.email || prev.email,
                        department: staff.departmentId?.name || staff.departmentId || prev.department
                    }));
                }
            } catch (error) {
                console.log("Error fetching staff details:", error);
            }
        };
        fetchStaffDetails();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const staffId = localStorage.getItem("staffId") || "me";
            
            const response = await API.post(`/staff/updateStaff/${staffId}`, {
                name: staffData.name,
                phone: staffData.phone,
                email: staffData.email,
                password: staffData.password
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

    let menus = [
        { name: "Dashboard", path: "/staff/dash" },
        { name: "View Live Queue", path: "/staff/ViewQueue" },
        { name: "Update Profile", path: "/staff/profile" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    return (
        <div className={styles.container}>
            <button onClick={() => toggleshow(!show)}
                style={{ borderRadius: '5px', border: 'none', width: '8ch', height: '8vh', position: 'fixed', top: '0px', left: '0px', cursor: 'pointer', fontSize: '18px' }}>
                ═
            </button>
            {show && <Menubar menus={menus} color={styles.Menu} />}

            <h2 className={styles.welcomeText}>Edit Profile</h2>
            
            <div className={styles.wrapper} style={{height:'auto', width: '100%', display: 'flex', justifyContent: 'center', marginTop: '20px'}}>
                <form action="" onSubmit={handleUpdate} className={styles.card} style={{width:'500px', maxWidth:'95%', padding:'30px', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', height:'auto'}}>
                    <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                        <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Name</span>
                        <input type="text" value={staffData.name} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setstaffData(prev=>{return {...prev,name:e.target.value}})}}/>
                    </label>
                    <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                        <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Department</span>
                        <input type="text" value={staffData.department} disabled style={{width:'100%', boxSizing:'border-box', opacity: 0.6, cursor: 'not-allowed'}} />
                    </label>
                    <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                        <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Phone Number</span>
                        <input type="text" value={staffData.phone} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setstaffData(prev=>{return {...prev,phone:e.target.value}})}} />
                    </label>
                    <label htmlFor="" style={{width:'100%', display:'flex', flexDirection:'column', gap:'8px'}} >
                        <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Email</span>
                        <input type="text" value={staffData.email} style={{width:'100%', boxSizing:'border-box'}} onChange={(e)=>{setstaffData(prev=>{return {...prev,email:e.target.value}})}}/>
                    </label>
                    <label htmlFor="password" style={{position: 'relative', width:'100%', display:'flex', flexDirection:'column', gap:'8px'}}>
                        <span style={{fontWeight:'bold', color:'#94a3b8', fontSize:'14px'}}>Password</span>
                        <input 
                            type={showPassword ? "text" : "password"}
                            style={{width:'100%', boxSizing:'border-box', paddingRight: '45px'}}
                            onChange={(e)=>{setstaffData(prev=>{return {...prev,password:e.target.value}})}} 
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
    );
}

export default StaffprofileEditor;