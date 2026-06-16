import { useState } from "react";
import { Link } from "react-router-dom";
import axios from 'axios'
import API from "../api";
import styles from "./login.module.css";
function Stafflogin(){
    let [staffId,setId]=useState("");
    let [password,setpass]=useState("")
    async function validatedata(){
        try{
            let data={staffId,password};
            console.log("data",data);
            let res=await axios.post("http://localhost:3000/auth/login/Staff",data,{withCredentials:true});
            alert("hello");
            localStorage.setItem("accessToken", res.data.accessToken); 
            localStorage.setItem("role",res.data.role)
            window.location.href="/staff/dash";
        }
        catch(err){
            console.log(err.response);
            let backenderr=err.response?.data?.msg;
            alert(backenderr);
        }
    }
    function Log(e){
        e.preventDefault();
        validatedata();
    }
    return (
    <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
            <h2>Staff Login</h2>
            <form onSubmit={Log}>
                <div className={styles.inputGroup}>
                    <label>User Id</label>
                    <input 
                        type="text" 
                        placeholder="SCQ-STAFF-1024"
                        onChange={(e) => setId(e.target.value)}
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
                <div style={{ textAlign: "right", marginTop: "-16px", marginBottom: "24px" }}>
                    <Link to="/forgot-password?role=staff" style={{ color: "#0dd5c3", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>Forgot password?</Link>
                </div>
                
                <button className={styles.loginBtn} type="submit">Login</button>
            </form>
        </div>
    </div>
);
}
export default Stafflogin;