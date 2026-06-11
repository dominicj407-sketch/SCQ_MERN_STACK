import { useState } from "react";
import { Link } from "react-router-dom";
import axios from 'axios'
import API from "../api";
import styles from "./login.module.css";
function PatientLogin(){
    //let navigate=useNavigate();
    let [email,setemail]=useState("");
    let [password,setpassword]=useState("")
    async function validatedata(){
        try{
            let data={email,password};
            let res=await axios.post("http://localhost:3000/auth/login/Patient",data,{withCredentials:true});
            alert("hello");
            localStorage.setItem("accessToken", res.data.accessToken); 
            localStorage.setItem("role",res.data.role);
            window.location.href="/patient/dash";
        }
        catch(err){
            let backenderr=err.response?.data?.msg;
            alert(backenderr)
        }
    }
    function Log(e){
        e.preventDefault();
        validatedata();
    }
    return (
    <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
            <h2>Patient Login</h2>
            <form onSubmit={Log}>
                <div className={styles.inputGroup}>
                    <label>Email</label>
                    <input 
                        type="email" 
                        placeholder="krris@gmail.com" 
                        onChange={(e) => setemail(e.target.value)}
                        required 
                    />
                </div>
                
                <div className={styles.inputGroup}>
                    <label>password</label>
                    <input 
                        type="password" 
                        placeholder="••••••••"
                        onChange={(e) => setpassword(e.target.value)}
                        required 
                    />
                </div>
                
                <button className={styles.loginBtn} type="submit">Login</button>
            </form>

            <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'20px 0 16px 0',width:'100%'}}>
                <div style={{flex:1,height:'1px',background:'#ddd'}}></div>
                <span style={{fontSize:'13px',color:'#999',fontWeight:'500'}}>OR</span>
                <div style={{flex:1,height:'1px',background:'#ddd'}}></div>
            </div>

            <button
                onClick={() => window.location.href = 'http://localhost:3000/auth/google'}
                style={{
                    width:'100%',padding:'12px',border:'2px solid #eee',borderRadius:'8px',
                    background:'white',cursor:'pointer',fontSize:'15px',fontWeight:'600',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                    color:'#333',transition:'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.borderColor = '#4285f4'}
                onMouseOut={(e) => e.target.style.borderColor = '#eee'}
            >
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
            </button>

            <p style={{marginTop:'16px',fontSize:'14px',color:'#666'}}>
                New here? <Link to="/patient/signup" style={{color:'#3f24b9',fontWeight:'600',textDecoration:'none'}}>Create an account</Link>
            </p>
        </div>
    </div>
);
}
export default PatientLogin;