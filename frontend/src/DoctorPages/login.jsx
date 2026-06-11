import { useState } from "react";
import axios from 'axios'
import services from "../authservices/login";
import styles from "./login.module.css";
import API from "../api";
function DoctorLogin(){
     let [doctorId,setdoctorId]=useState("");
    let [password,setpassword]=useState("");
    async function validatedata(){
        try{
            console.log("🩺 Doctor Login - Sending credentials for doctorId:", doctorId);
            let data={doctorId,password,url:"/login/Doctor"};
            let res=await axios.post("http://localhost:3000/auth/login/Doctor",data,{
                withCredentials:true
            });
            console.log("🩺 Doctor Login Response:", res.data);
            alert(res.data.accessToken);
            localStorage.setItem("accessToken", res.data.accessToken); 
            localStorage.setItem("role",res.data.role);
            console.log("🩺 Stored in localStorage - role:", res.data.role);
            console.log("🩺 Stored accessToken (first 50 chars):", res.data.accessToken.substring(0, 50) + "...");
            window.location.href="/doctor/dash";
        }
        catch(err){
            let backenderr=err.response.data.msg;
            console.log("error:",err);
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
            <h2>Doctor Login</h2>
            <form onSubmit={Log}>
                <div className={styles.inputGroup}>
                    <label>User Id</label>
                    <input 
                        type="text" 
                        placeholder="er235#33"
                        onChange={(e) => setdoctorId(e.target.value)}
                        required 
                    />
                </div>
                
                <div className={styles.inputGroup}>
                    <label>password
                    <input 
                        type="password" 
                        name="password"
                        onChange={(e) => setpassword(e.target.value)}
                        required 
                    /></label>
                </div>
                
                <button className={styles.loginBtn} type="submit">Login</button>
            </form>
        </div>
    </div>
);
}
export default DoctorLogin;