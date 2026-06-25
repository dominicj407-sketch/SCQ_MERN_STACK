import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authUrl } from "../api";
import styles from "./login.module.css";

function ForgotPassword() {
    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get("role") || "patient";

    const [role, setRole] = useState(defaultRole.charAt(0).toUpperCase() + defaultRole.slice(1).toLowerCase()); 
    const [email, setEmail] = useState("");
    const [masterPassword, setMasterPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                role,
                masterPassword,
                newPassword
            };

            if (role === "Patient") {
                payload.email = email;
            } else {
                
                if (email.includes("@")) {
                    payload.email = email;
                } else {
                    payload.identifier = email;
                }
            }

            const res = await axios.post(authUrl("/forgot-password"), payload, { withCredentials: true });
            setMessage("✅ " + res.data.msg);
            setTimeout(() => {
                window.location.href = `/${role.toLowerCase()}/login`;
            }, 2000);
        } catch (err) {
            console.error("Forgot password error:", err);
            setError(err.response?.data?.msg || err.response?.data?.error || "Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginWrapper}>
            <div className={styles.loginWrapper && styles.loginCard}>
                <h2>Reset Password</h2>
                <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "-20px", marginBottom: "30px", textAlign: "center" }}>
                    Recover your password using your unique Master Password.
                </p>

                <form onSubmit={handleReset}>
                    <div className={styles.inputGroup}>
                        <label>Select Role</label>
                        <select 
                            value={role} 
                            onChange={(e) => {
                                setRole(e.target.value);
                                setEmail("");
                            }}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                backgroundColor: "rgba(15, 23, 42, 0.6)",
                                borderRadius: "10px",
                                color: "#f8fafc",
                                fontSize: "0.95rem",
                                outline: "none",
                                fontFamily: "inherit"
                            }}
                            required
                        >
                            <option value="Patient">Patient</option>
                            <option value="Doctor">Doctor</option>
                            <option value="Staff">Staff</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>
                            {role === "Patient" ? "Email Address" : `${role} ID or Email Address`}
                        </label>
                        <input 
                            type="text" 
                            placeholder={role === "Patient" ? "you@example.com" : `Enter your ${role.toLowerCase()} ID or email`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Master Password Recovery Key</label>
                        <input 
                            type="text" 
                            placeholder="MP-XXXXXX"
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            required 
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>New Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required 
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Confirm New Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required 
                        />
                    </div>

                    {error && (
                        <p style={{
                            color: "#f43f5e",
                            backgroundColor: "rgba(244, 63, 94, 0.1)",
                            border: "1px solid rgba(244, 63, 94, 0.2)",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            textAlign: "center",
                            margin: "15px 0"
                        }}>
                            ❌ {error}
                        </p>
                    )}

                    {message && (
                        <p style={{
                            color: "#34d399",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            textAlign: "center",
                            margin: "15px 0"
                        }}>
                            {message}
                        </p>
                    )}

                    <button className={styles.loginBtn} type="submit" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <p style={{ marginTop: "20px", fontSize: "14px", color: "#666", textAlign: "center" }}>
                    Remember your password?{" "}
                    <Link to={`/${role.toLowerCase()}/login`} style={{ color: "#0dd5c3", fontWeight: "600", textDecoration: "none" }}>
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;
