import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api.js";
import styles from "./admin.module.css";

// ── SVG Mini-Chart Components ──────────────────────────────────────────────

function MiniLineChart({ data, width = 500, height = 200, color = "#a78bfa" }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = data.map((d, i) => ({
        x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
        y: padding.top + chartH - (d.value / max) * chartH,
        label: d.label,
        value: d.value
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    // Y-axis grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
        y: padding.top + chartH - frac * chartH,
        label: Math.round(frac * max)
    }));

    return (
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {gridLines.map((g, i) => (
                <g key={i}>
                    <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y}
                        stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4,4" />
                    <text x={padding.left - 8} y={g.y + 4} textAnchor="end"
                        fill="#94a3b8" fontSize="11">{g.label}</text>
                </g>
            ))}
            {/* Area fill */}
            <path d={areaPath} fill={`${color}15`} />
            {/* Line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots and labels */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
                    <text x={p.x} y={padding.top + chartH + 20} textAnchor="middle"
                        fill="#cbd5e1" fontSize="10">{p.label}</text>
                    <text x={p.x} y={p.y - 10} textAnchor="middle"
                        fill="#ffffff" fontSize="10" fontWeight="600">₹{p.value}</text>
                </g>
            ))}
        </svg>
    );
}

function MiniBarChart({ data, width = 500, height = 200, color = "#34d399" }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barWidth = Math.min(40, (chartW / data.length) * 0.6);
    const gap = (chartW - barWidth * data.length) / (data.length + 1);

    const colors = ["#8b5cf6", "#10b981", "#fb923c", "#f43f5e", "#a78bfa", "#06b6d4", "#ec4899"];

    return (
        <svg width={width} height={height}>
            {/* Base line */}
            <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH}
                stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
            {data.map((d, i) => {
                const barH = (d.value / max) * chartH;
                const x = padding.left + gap + i * (barWidth + gap);
                const y = padding.top + chartH - barH;
                const barColor = colors[i % colors.length];
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barWidth} height={barH}
                            fill={barColor} rx="4" ry="4" opacity="0.85" />
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle"
                            fill={barColor} fontSize="11" fontWeight="700">{d.value}</text>
                        <text x={x + barWidth / 2} y={padding.top + chartH + 16} textAnchor="middle"
                            fill="#cbd5e1" fontSize="9" fontWeight="500">
                            {d.label.length > 8 ? d.label.substring(0, 8) + '…' : d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Main AdminDashboard ────────────────────────────────────────────────────

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("departments");
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const navigate = useNavigate();

    const [deptForm, setDeptForm] = useState({ name: "", hospitalId: "" });
    const [doctorForm, setDoctorForm] = useState({ name: "", id: "", phone: "", email: "", password: "", age: "", gender: "", hospitalId: "", departmentId: "" });
    const [staffForm, setStaffForm] = useState({ name: "", staffId: "", phone: "", email: "", password: "", age: "", gender: "", hospitalId: "", departmentId: "" });
    const [assignForm, setAssignForm] = useState({ staffId: "", doctorId: "" });

    useEffect(() => {
        fetchDepartments();
        fetchDoctors();
        fetchStaffs();
        fetchAssignments();
    }, []);

    useEffect(() => {
        if (activeTab === "analytics" && !analytics) {
            fetchAnalytics();
        }
    }, [activeTab]);

    const fetchDepartments = async () => {
        try {
            const res = await API.get("/admin/getDept");
            setDepartments(res.data.departments || []);
        } catch (err) { console.error(err); }
    };

    const fetchDoctors = async () => {
        try {
            const res = await API.get("/admin/getDoctors");
            setDoctors(res.data.doctors || []);
        } catch (err) { console.error(err); }
    };

    const fetchStaffs = async () => {
        try {
            const res = await API.get("/admin/getStaffs");
            setStaffs(res.data.staffs || []);
        } catch (err) { console.error(err); }
    };

    const fetchAssignments = async () => {
        try {
            const res = await API.get("/admin/getAssignments");
            setAssignments(res.data.assignments || []);
        } catch (err) { console.error(err); }
    };

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const res = await API.get("/admin/analytics");
            setAnalytics(res.data);
        } catch (err) { console.error("Analytics fetch error:", err); }
        setAnalyticsLoading(false);
    };

    const handleAddDept = async (e) => {
        e.preventDefault();
        try {
            await API.post("/admin/addDept", deptForm);
            alert("Department added");
            setDeptForm({ name: "", hospitalId: "" });
            fetchDepartments();
        } catch (err) { alert("Error adding department"); }
    };

    const handleAddDoctor = async (e) => {
        e.preventDefault();
        try {
            await API.post("/admin/addDoctor", doctorForm);
            alert("Doctor added");
            setDoctorForm({ name: "", id: "", phone: "", email: "", password: "", age: "", gender: "", hospitalId: "", departmentId: "" });
            fetchDoctors();
        } catch (err) { alert("Error adding doctor"); }
    };

    const handleDeleteDoctor = async (did) => {
        if (!window.confirm("Are you sure you want to delete this doctor?")) return;
        try {
            await API.get(`/admin/deleteDoctor/${did}`);
            alert("Doctor deleted");
            fetchDoctors();
        } catch (err) { alert("Error deleting doctor: " + (err.response?.data?.msg || err.message)); }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            await API.post("/admin/addStaff", staffForm);
            alert("Staff added");
            setStaffForm({ name: "", staffId: "", phone: "", email: "", password: "", age: "", gender: "", hospitalId: "", departmentId: "" });
            fetchStaffs();
        } catch (err) { alert("Error adding staff"); }
    };

    const handleDeleteStaff = async (sid) => {
        if (!window.confirm("Are you sure you want to delete this staff member?")) return;
        try {
            await API.get(`/admin/deleteStaff/${sid}`);
            alert("Staff deleted");
            fetchStaffs();
        } catch (err) { alert("Error deleting staff: " + (err.response?.data?.msg || err.message)); }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await API.post("/admin/assignStaffToDoctor", assignForm);
            alert("Staff assigned");
            setAssignForm({ staffId: "", doctorId: "" });
            fetchAssignments();
        } catch (err) { alert("Error assigning staff"); }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    // ── Stat Card ──────────────────────────────────────────────────────
    const StatCard = ({ icon, label, value, color, sub }) => (
        <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px', padding: '20px', minWidth: '160px',
            flex: '1 1 160px', textAlign: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>{label}</div>
            {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{sub}</div>}
        </div>
    );

    return (
        <div className={styles.dashboardContainer}>
            <h1>Admin Dashboard</h1>
            <div className={styles.tabButtons}>
                <button onClick={() => setActiveTab("departments")} style={activeTab === "departments" ? { backgroundColor: '#2980b9' } : {}}>Departments</button>
                <button onClick={() => setActiveTab("doctors")} style={activeTab === "doctors" ? { backgroundColor: '#2980b9' } : {}}>Doctors</button>
                <button onClick={() => setActiveTab("staffs")} style={activeTab === "staffs" ? { backgroundColor: '#2980b9' } : {}}>Staffs</button>
                <button onClick={() => setActiveTab("assignments")} style={activeTab === "assignments" ? { backgroundColor: '#2980b9' } : {}}>Assignments</button>
                <button onClick={() => setActiveTab("analytics")} style={activeTab === "analytics" ? { backgroundColor: '#8b5cf6' } : { backgroundColor: '#8b5cf6', opacity: 0.8 }}>📊 Analytics</button>
                <button onClick={() => window.open("/tv-display", "_blank")} style={{ backgroundColor: '#2e7d32', color: 'white', fontWeight: 'bold' }}>📺 TV Display Board</button>
                <button onClick={() => setActiveTab("profile")} style={activeTab === "profile" ? { backgroundColor: '#2980b9' } : {}}>Profile</button>
            </div>

            {activeTab === "departments" && (
                <div className={styles.tabContent}>
                    <h2>Add Department</h2>
                    <form onSubmit={handleAddDept} className={styles.formGroup}>
                        <input type="text" placeholder="Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required />
                        <input type="text" placeholder="Hospital ID" value={deptForm.hospitalId} onChange={(e) => setDeptForm({ ...deptForm, hospitalId: e.target.value })} required />
                        <button type="submit">Add Department</button>
                    </form>
                    <h3>Departments ({departments.length})</h3>
                    <ul className={styles.list}>
                        {departments.map(d => <li key={d._id}>{d.name} <span style={{fontSize:'11px',color:'#999'}}>ID: {d._id}</span></li>)}
                    </ul>
                </div>
            )}

            {activeTab === "doctors" && (
                <div className={styles.tabContent}>
                    <h2>Add Doctor</h2>
                    <form onSubmit={handleAddDoctor} className={styles.formGroup}>
                        <input type="text" placeholder="Name" value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} required />
                        <input type="text" placeholder="ID (e.g. DOC-001)" value={doctorForm.id} onChange={(e) => setDoctorForm({ ...doctorForm, id: e.target.value })} required />
                        <input type="text" placeholder="Phone (+91XXXXXXXXXX)" value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} required />
                        <input type="email" placeholder="Email" value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} required />
                        <input type="password" placeholder="Password" value={doctorForm.password} onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} required />
                        <input type="number" placeholder="Age" value={doctorForm.age} onChange={(e) => setDoctorForm({ ...doctorForm, age: e.target.value })} required />
                        <select value={doctorForm.gender} onChange={(e) => setDoctorForm({ ...doctorForm, gender: e.target.value })} required>
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="text" placeholder="Hospital ID" value={doctorForm.hospitalId} onChange={(e) => setDoctorForm({ ...doctorForm, hospitalId: e.target.value })} required />
                        <select value={doctorForm.departmentId} onChange={(e) => setDoctorForm({ ...doctorForm, departmentId: e.target.value })} required>
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button type="submit">Add Doctor</button>
                    </form>
                    <h3>Doctors ({doctors.length})</h3>
                    <ul className={styles.list}>
                        {doctors.map(d => (
                            <li key={d._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <div>
                                    <strong>{d.name}</strong> — {d.email}
                                    <div style={{fontSize:'12px',color:'#888',marginTop:'2px'}}>ID: {d.id} | Phone: {d.phone}</div>
                                </div>
                                <button
                                    onClick={() => handleDeleteDoctor(d.id)}
                                    style={{padding:'6px 14px',backgroundColor:'#e74c3c',color:'white',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {activeTab === "staffs" && (
                <div className={styles.tabContent}>
                    <h2>Add Staff</h2>
                    <form onSubmit={handleAddStaff} className={styles.formGroup}>
                        <input type="text" placeholder="Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required />
                        <input type="text" placeholder="Staff ID (e.g. SCQ-STAFF-1024)" value={staffForm.staffId} onChange={(e) => setStaffForm({ ...staffForm, staffId: e.target.value })} required />
                        <input type="text" placeholder="Phone (+91XXXXXXXXXX)" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} required />
                        <input type="email" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
                        <input type="password" placeholder="Password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />
                        <input type="number" placeholder="Age" value={staffForm.age} onChange={(e) => setStaffForm({ ...staffForm, age: e.target.value })} required />
                        <select value={staffForm.gender} onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value })} required>
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="text" placeholder="Hospital ID" value={staffForm.hospitalId} onChange={(e) => setStaffForm({ ...staffForm, hospitalId: e.target.value })} required />
                        <select value={staffForm.departmentId} onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })} required>
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button type="submit">Add Staff</button>
                    </form>
                    <h3>Staffs ({staffs.length})</h3>
                    <ul className={styles.list}>
                        {staffs.map(s => (
                            <li key={s._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <div>
                                    <strong>{s.name}</strong> — {s.email}
                                    <div style={{fontSize:'12px',color:'#888',marginTop:'2px'}}>Staff ID: {s.staffId} | Phone: {s.phone}</div>
                                </div>
                                <button
                                    onClick={() => handleDeleteStaff(s.staffId)}
                                    style={{padding:'6px 14px',backgroundColor:'#e74c3c',color:'white',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {activeTab === "assignments" && (
                <div className={styles.tabContent}>
                    <h2>Assign Staff to Doctor</h2>
                    <form onSubmit={handleAssign} className={styles.formGroup}>
                        <select value={assignForm.staffId} onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })} required>
                            <option value="">Select Staff</option>
                            {staffs.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <select value={assignForm.doctorId} onChange={(e) => setAssignForm({ ...assignForm, doctorId: e.target.value })} required>
                            <option value="">Select Doctor</option>
                            {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button type="submit">Assign</button>
                    </form>
                    <h3>Assignments ({assignments.length})</h3>
                    <ul className={styles.list}>
                        {assignments.map(a => <li key={a._id}>{a.staffId?.name} assigned to {a.doctorId?.name}</li>)}
                    </ul>
                </div>
            )}

            {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
            {activeTab === "analytics" && (
                <div className={styles.tabContent} style={{ maxWidth: '900px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: '#a78bfa' }}>📊 Hospital Analytics</h2>
                        <button
                            onClick={fetchAnalytics}
                            disabled={analyticsLoading}
                            style={{
                                padding: '8px 18px', backgroundColor: '#8b5cf6', color: 'white',
                                border: 'none', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: '600', fontSize: '13px'
                            }}
                        >
                            {analyticsLoading ? "Loading..." : "🔄 Refresh"}
                        </button>
                    </div>

                    {analyticsLoading && !analytics && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                            <p>Loading analytics data...</p>
                        </div>
                    )}

                    {analytics && (
                        <>
                            {/* ── KPI Cards ─────────────────────────────── */}
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
                                <StatCard icon="👥" label="Today's Patients" value={analytics.today.total} color="#3b82f6" />
                                <StatCard icon="✅" label="Completed" value={analytics.today.completed} color="#10b981" />
                                <StatCard icon="⏳" label="Waiting" value={analytics.today.waiting} color="#fb923c" />
                                <StatCard icon="❌" label="Cancelled" value={analytics.today.cancelled} color="#f43f5e" />
                                <StatCard icon="💰" label="Today's Revenue" value={`₹${analytics.today.revenue}`} color="#a78bfa" />
                            </div>

                            {/* ── Time Stats ────────────────────────────── */}
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
                                <StatCard icon="⏱️" label="Avg Wait Time" value={`${analytics.today.avgWaitMinutes}m`} color="#06b6d4"
                                    sub="booked → consultation" />
                                <StatCard icon="🩺" label="Avg Consult Time" value={`${analytics.today.avgConsultMinutes}m`} color="#ec4899"
                                    sub="start → complete" />
                                <StatCard icon="⏭️" label="Skipped" value={analytics.today.skipped} color="#fb923c" />
                                <StatCard icon="📋" label="All-Time Total" value={analytics.allTime.totalAppointments} color="#94a3b8" />
                            </div>

                            {/* ── 7-Day Revenue Chart ────────────────────── */}
                            <div style={{
                                background: 'rgba(17, 24, 39, 0.75)', borderRadius: '14px', padding: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', color: '#a78bfa', fontSize: '16px' }}>
                                    💰 7-Day Revenue Trend
                                </h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <MiniLineChart
                                        data={analytics.revenueTrend.map(r => ({ label: r.label, value: r.revenue }))}
                                        width={560} height={220} color="#8b5cf6"
                                    />
                                </div>
                            </div>

                            {/* ── Department Traffic + Doctor Performance ── */}
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {/* Department Traffic */}
                                <div style={{
                                    flex: '1 1 300px', background: 'rgba(17, 24, 39, 0.75)', borderRadius: '14px',
                                    padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                                }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#34d399', fontSize: '16px' }}>
                                        🏥 Department Traffic (Today)
                                    </h3>
                                    {analytics.deptTraffic.length > 0 ? (
                                        <MiniBarChart
                                            data={analytics.deptTraffic.map(d => ({ label: d.name, value: d.count }))}
                                            width={Math.max(300, analytics.deptTraffic.length * 80)} height={200}
                                        />
                                    ) : (
                                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No department data yet today.</p>
                                    )}
                                </div>

                                {/* 7-Day Patient Traffic */}
                                <div style={{
                                    flex: '1 1 300px', background: 'rgba(17, 24, 39, 0.75)', borderRadius: '14px',
                                    padding: '24px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                                }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8', fontSize: '16px' }}>
                                        📈 7-Day Patient Volume
                                    </h3>
                                    <MiniLineChart
                                        data={analytics.trafficTrend.map(t => ({ label: t.label, value: t.count }))}
                                        width={340} height={200} color="#3b82f6"
                                    />
                                </div>
                            </div>

                            {/* ── Doctor Performance Table ────────────────── */}
                            {analytics.doctorPerformance.length > 0 && (
                                <div style={{
                                    background: 'rgba(17, 24, 39, 0.75)', borderRadius: '14px', padding: '24px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                                }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '16px' }}>
                                        👨‍⚕️ Doctor Performance (Today)
                                    </h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{
                                            width: '100%', borderCollapse: 'collapse',
                                            fontSize: '14px'
                                        }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#ffffff' }}>Doctor</th>
                                                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#ffffff' }}>Status</th>
                                                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#ffffff' }}>Completed</th>
                                                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#ffffff' }}>Waiting</th>
                                                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#ffffff' }}>Total</th>
                                                    <th style={{ textAlign: 'center', padding: '10px 12px', color: '#ffffff' }}>Progress</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analytics.doctorPerformance.map((doc, i) => {
                                                    const pct = doc.total > 0 ? Math.round((doc.completed / doc.total) * 100) : 0;
                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#cbd5e1' }}>Dr. {doc.name}</td>
                                                            <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                                                <span style={{
                                                                    padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                                                    background: doc.status === 'available' ? 'rgba(16, 185, 129, 0.15)' : doc.status === 'offline' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                                                    color: doc.status === 'available' ? '#34d399' : doc.status === 'offline' ? '#f43f5e' : '#fb923c',
                                                                    border: `1px solid ${doc.status === 'available' ? 'rgba(16, 185, 129, 0.3)' : doc.status === 'offline' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`
                                                                }}>
                                                                    {doc.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#34d399' }}>{doc.completed}</td>
                                                            <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#fb923c' }}>{doc.waiting}</td>
                                                            <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: '700', color: '#cbd5e1' }}>{doc.total}</td>
                                                            <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                                                <div style={{
                                                                    background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', height: '12px',
                                                                    overflow: 'hidden', position: 'relative', minWidth: '80px'
                                                                }}>
                                                                    <div style={{
                                                                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                                                                        height: '100%', width: `${pct}%`,
                                                                        borderRadius: '10px', transition: 'width 0.5s ease'
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{pct}%</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === "profile" && (
                <div className={styles.tabContent}>
                    <h2>Admin Profile</h2>
                    <div style={{padding:'20px 0'}}>
                        <div style={{marginBottom:'16px'}}>
                            <strong style={{color:'#7f8c8d',fontSize:'13px',textTransform:'uppercase'}}>Email</strong>
                            <p style={{margin:'4px 0 0 0',fontSize:'16px',color:'#2c3e50'}}>admin@hospital.com</p>
                        </div>
                        <div style={{marginBottom:'16px'}}>
                            <strong style={{color:'#7f8c8d',fontSize:'13px',textTransform:'uppercase'}}>Role</strong>
                            <p style={{margin:'4px 0 0 0',fontSize:'16px',color:'#2c3e50'}}>System Administrator</p>
                        </div>
                        <div style={{marginBottom:'16px'}}>
                            <strong style={{color:'#7f8c8d',fontSize:'13px',textTransform:'uppercase'}}>Statistics</strong>
                            <div style={{display:'flex',gap:'16px',marginTop:'8px',flexWrap:'wrap'}}>
                                <div style={{background:'#e3f2fd',padding:'12px 20px',borderRadius:'8px',textAlign:'center'}}>
                                    <div style={{fontSize:'20px',fontWeight:'bold',color:'#1565c0'}}>{departments.length}</div>
                                    <div style={{fontSize:'12px',color:'#1565c0'}}>Departments</div>
                                </div>
                                <div style={{background:'#e8f5e9',padding:'12px 20px',borderRadius:'8px',textAlign:'center'}}>
                                    <div style={{fontSize:'20px',fontWeight:'bold',color:'#2e7d32'}}>{doctors.length}</div>
                                    <div style={{fontSize:'12px',color:'#2e7d32'}}>Doctors</div>
                                </div>
                                <div style={{background:'#fff3e0',padding:'12px 20px',borderRadius:'8px',textAlign:'center'}}>
                                    <div style={{fontSize:'20px',fontWeight:'bold',color:'#e65100'}}>{staffs.length}</div>
                                    <div style={{fontSize:'12px',color:'#e65100'}}>Staff</div>
                                </div>
                                <div style={{background:'#f3e5f5',padding:'12px 20px',borderRadius:'8px',textAlign:'center'}}>
                                    <div style={{fontSize:'20px',fontWeight:'bold',color:'#6a1b9a'}}>{assignments.length}</div>
                                    <div style={{fontSize:'12px',color:'#6a1b9a'}}>Assignments</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{marginTop:'20px',padding:'12px 28px',backgroundColor:'#e74c3c',color:'white',border:'none',borderRadius:'6px',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;