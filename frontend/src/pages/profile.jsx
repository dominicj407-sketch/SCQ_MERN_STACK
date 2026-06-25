import axios from "axios";
import { useEffect, useState } from "react";
import API, { authUrl } from "../api";
import Menubar from "../utils.jsx/menubar.jsx";
import styles from "./patients.module.css";

function PatientProfile() {
    const [patient, setPatient] = useState({});
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [patientId, setPatientId] = useState(null);

    const menus = [
        { name: "Home", path: "/patient/dash" },
        { name: "My Appointments", path: "/patient/appointments" },
        { name: "Book Appointment", path: "/patient/book" },
        { name: "📺 TV Display Board", path: "/tv-display" }
    ];

    useEffect(() => {
        let isMounted = true;
        const fetchPatient = async () => {
            try {
                let res = await API.get("/patients/getPatientById/dummy", {
                    withCredentials: true,
                    headers: { Authorization: `bearer ${localStorage.getItem('accessToken')}` }
                });
                if (!isMounted) return;
                setPatient(res.data.p);
                setFormData(res.data.p);
                setPatientId(res.data.p._id);
            } catch (err) {
                console.error("Error loading patient profile:", err);
                if (err.response?.status === 401) {
                    try {
                        let res = await axios.post(authUrl("/refresh/Patient"), {}, { withCredentials: true });
                        localStorage.setItem('accessToken', res.data.accessToken);
                        res = await API.get("/patients/getPatientById/dummy", {
                            withCredentials: true,
                            headers: { Authorization: `bearer ${localStorage.getItem("accessToken")}` }
                        });
                        if (!isMounted) return;
                        setPatient(res.data.p);
                        setFormData(res.data.p);
                        setPatientId(res.data.p._id);
                    } catch (referror) {
                        localStorage.clear();
                        window.location.href = "/patient/login";
                        return;
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPatient();
        return () => { isMounted = false; };
    }, []);

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        setFormData(patient);
        setEditing(false);
    };

    const handleSave = async () => {
        try {
            await API.post(`/patients/updatePatients/${patientId}`, formData, {
                withCredentials: true,
                headers: { Authorization: `bearer ${localStorage.getItem('accessToken')}` }
            });
            setPatient(formData);
            setEditing(false);
            alert("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Failed to update profile. Please try again.");
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) {
        return (
            <div className={styles.patientContainer}>
                <div className={styles.contentWrapper}>
                    <Menubar menus={menus} color="blue" />
                    <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.patientContainer}>
            <div className={styles.contentWrapper}>
                <Menubar menus={menus} color="blue" />

                <div className={styles.mainContent}>
                    <h1 className={styles.pageTitle}>My Profile</h1>

                    <div className={styles.profileCard}>
                        <div className={styles.profileSection}>
                            <label className={styles.profileLabel}>Name:</label>
                            {editing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    className={styles.profileInput}
                                />
                            ) : (
                                <div className={styles.profileValue}>{patient.name}</div>
                            )}
                        </div>

                        <div className={styles.profileSection}>
                            <label className={styles.profileLabel}>Email:</label>
                            {editing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    className={styles.profileInput}
                                />
                            ) : (
                                <div className={styles.profileValue}>{patient.email}</div>
                            )}
                        </div>

                        <div className={styles.profileSection}>
                            <label className={styles.profileLabel}>Phone:</label>
                            {editing ? (
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className={styles.profileInput}
                                />
                            ) : (
                                <div className={styles.profileValue}>{patient.phone}</div>
                            )}
                        </div>

                        <div className={styles.profileSection}>
                            <label className={styles.profileLabel}>Age:</label>
                            {editing ? (
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age || ''}
                                    onChange={handleChange}
                                    className={styles.profileInput}
                                />
                            ) : (
                                <div className={styles.profileValue}>{patient.age}</div>
                            )}
                        </div>

                        <div className={styles.profileSection}>
                            <label className={styles.profileLabel}>Gender:</label>
                            {editing ? (
                                <select
                                    name="gender"
                                    value={formData.gender || ''}
                                    onChange={handleChange}
                                    className={styles.profileSelect}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            ) : (
                                <div className={styles.profileValue}>
                                    {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : ''}
                                </div>
                            )}
                        </div>

                        <div className={styles.profileButtonGroup}>
                            {editing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        className={`${styles.profileButton} ${styles.saveButton}`}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className={`${styles.profileButton} ${styles.cancelButton}`}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleEdit}
                                    className={`${styles.profileButton} ${styles.editButton}`}
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientProfile;
