import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './home.module.css';

function Home() {
    const navigate = useNavigate();

    const portals = [
        { title: "Patient Portal", desc: "Book appointments & check live queue", path: "/patient/login", icon: "🏥", color: "#3b82f6" },
        { title: "Doctor Console", desc: "Manage consultations & daily limits", path: "/doctor/login", icon: "👨‍⚕️", color: "#10b981" },
        { title: "Staff Dashboard", desc: "Monitor check-ins & patient flow", path: "/staff/login", icon: "📋", color: "#f59e0b" },
        { title: "Admin Panel", desc: "Manage doctors, staff & departments", path: "/admin/login", icon: "🔐", color: "#ef4444" }
    ];

    return (
        <div className={styles.homeWrapper}>
            <header className={styles.header}>
                <h1 className={styles.logo}>SmartCare<span>Q</span></h1>
            </header>

            <main className={styles.main}>
                <div className={styles.heroSection}>
                    <h2>Welcome to SmartCareQ</h2>
                    <p>Select your portal to continue</p>
                </div>

                <div className={styles.grid}>
                    {portals.map((portal) => (
                        <div 
                            key={portal.title} 
                            className={styles.portalCard}
                            onClick={() => navigate(portal.path)}
                            style={{ '--accent': portal.color }}
                        >
                            <div className={styles.icon}>{portal.icon}</div>
                            <h3>{portal.title}</h3>
                            <p>{portal.desc}</p>
                            <button className={styles.goBtn}>Enter Portal →</button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Home;