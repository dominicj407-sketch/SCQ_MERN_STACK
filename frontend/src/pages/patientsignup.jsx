import { useState } from "react";
import { Link } from "react-router-dom";
import axios from 'axios'
import { apiUrl } from "../api";
import styles from "./login.module.css";

function PatientSignup(){
    let [email,setmail]=useState("");
    let [password,setpass]=useState("");
    let [name,setName]=useState("")
    let [phone,setPhone]=useState("");
    let [DOB,setDOB]=useState("");
    let [gender,setGender]=useState("");
    let [age,setAge]=useState("");
    let [loading, setLoading] = useState(false);

    async function submitdata(){
        try{ 
            setLoading(true);
            let data={email,password,phone,name,gender,age: Number(age)};
            let res=await axios.post(apiUrl("/patients/registerPatient"),data,{withCredentials:true});
            alert(res.data.msg || "Registration successful!");
            window.location.href="/patient/login";
        }
        catch(err){
            let backenderr=err.response?.data?.message || err.response?.data?.msg || "Registration failed. Please try again.";
            alert(backenderr);
        } finally {
            setLoading(false);
        }
    }

    function handleDOBChange(e) {
        const dob = e.target.value;
        setDOB(dob);
        if (dob) {
            const birthYear = new Date(dob).getFullYear();
            const currentYear = new Date().getFullYear();
            setAge(String(currentYear - birthYear));
        }
    }

    function Log(e){
        e.preventDefault();
        submitdata();
    }

    return (
    <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
            <h2>Patient Register</h2>
            <form onSubmit={Log}>
                
                <div className={styles.inputGroup}>
                    <label>Full Name</label>
                    <input  
                        type="text"
                        placeholder="John Doe"
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Gender</label>
                    <select 
                        onChange={(e) => setGender(e.target.value)}
                        required
                        style={{
                            width:'100%', padding:'12px 15px', border:'2px solid #eee',
                            borderRadius:'8px', fontSize:'1rem', boxSizing:'border-box',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className={styles.inputGroup}>
                    <label>Date of Birth</label>
                    <input type="date"
                        onChange={handleDOBChange}
                        required
                    />
                </div>

                {age && (
                    <div className={styles.inputGroup}>
                        <label>Age (auto-calculated)</label>
                        <input 
                            type="number" 
                            value={age}
                            readOnly
                            style={{backgroundColor:'#f5f5f5'}}
                        />
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label>Email</label>
                    <input 
                        type="email" 
                        placeholder="email@example.com"
                        onChange={(e) => setmail(e.target.value)}
                        required
                    />
                </div>
                
                <div className={styles.inputGroup}>
                    <label>Phone Number</label>
                    <input 
                        type="text" 
                        placeholder="+919876543210"
                        pattern="^\+?\d{10,15}$" 
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Password</label>
                    <input 
                        type="password" 
                        placeholder="••••••••"
                        onChange={(e) => setpass(e.target.value)}
                        required
                    />
                </div>
                
                <button className={styles.loginBtn} type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>
            <p style={{marginTop:'16px',fontSize:'14px',color:'#666'}}>
                Already have an account? <Link to="/patient/login" style={{color:'#3f24b9',fontWeight:'600',textDecoration:'none'}}>Login</Link>
            </p>
        </div>
    </div>
);
}
export default PatientSignup;
