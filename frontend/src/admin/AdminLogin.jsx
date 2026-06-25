import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authUrl } from "../api.js";
import axios from "axios";
import styles from "./admin.module.css";

function AdminLogin() {
    const [form, setForm] = useState({ email: "", password: "" });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        try {
            const res = await axios.post(authUrl("/login/Admin"), form, { withCredentials: true });
            localStorage.setItem("accessToken", res.data.accessToken);
            navigate("/admin/dash");
        } catch (err) {
            alert(err.response.data.msg);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <h2>Admin Login</h2>
                <form onSubmit={(e)=>{ e.preventDefault();handleSubmit()}}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;
