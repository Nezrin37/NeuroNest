import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminDashboardApi } from '../../api/adminDashboardApi';
import { Users, UserPlus, Calendar, DollarSign, FileText, CreditCard, Star, Radio, Activity, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const AdminDashboard = () => {
    const [data, setData] = useState({
        stats: [],
        activities: [],
        tasks: [],
        chartData: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminDashboardApi.getDashboardSummary();
            setData({
                stats: response.stats || [],
                activities: response.activities || [],
                tasks: response.tasks || [],
                chartData: response.chartData || []
            });
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
            setError("Failed to load dashboard data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const getStatIcon = (id) => {
        switch (id) {
            case 'patients': return <Users size={24} />;
            case 'doctors': return <UserPlus size={24} />;
            case 'load': return <Activity size={24} />;
            case 'revenue': return <DollarSign size={24} />;
            default: return <Activity size={24} />;
        }
    };

    const modules = [
        { title: 'Manage Patients', desc: 'Securely access and update patient health records.', icon: <Users size={20} />, path: '/admin/manage-patients', color: 'primary' },
        { title: 'Manage Doctors', desc: 'Manage medical staff profiles and credentials.', icon: <UserPlus size={20} />, path: '/admin/manage-doctors', color: 'success' },
        { title: 'Appointments', desc: 'Oversee scheduling across all departments.', icon: <Calendar size={20} />, path: '/admin/appointment-management', color: 'info' },
        { title: 'Assessments', desc: 'Analyze clinical outcomes and test results.', icon: <FileText size={20} />, path: '/admin/assessment-management', color: 'warning' },
        { title: 'Payments', desc: 'Automated billing and financial reconciliation.', icon: <CreditCard size={20} />, path: '/admin/payment-management', color: 'danger' },
        { title: 'Reviews', desc: 'Monitor and respond to patient feedback.', icon: <Star size={20} />, path: '/admin/review-management', color: 'secondary' },
    ];

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
            <div className="spinner-border text-primary border-4 mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary fw-bold text-uppercase small" style={{ letterSpacing: '2px' }}>Initializing Operations Nexus...</p>
        </div>
    );

    if (error) return (
        <div className="container py-5 text-center">
            <div className="alert alert-danger d-inline-block px-5 py-4 rounded-4 shadow-sm">
                <AlertCircle size={40} className="mb-3" />
                <h4 className="fw-bolder">System Integrity Issue</h4>
                <p className="mb-4">{error}</p>
                <button onClick={fetchDashboardData} className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm">Retry Connection</button>
            </div>
        </div>
    );

    return (
        <div className="container-fluid py-4 min-vh-100 bg-light px-lg-4">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
                <div>
                    <div className="text-secondary small fw-bold text-uppercase mb-1" style={{ letterSpacing: '1px' }}>Admin Console / Dashboard</div>
                    <h1 className="h3 fw-black text-dark mb-0">System Overview</h1>
                </div>
                <button className="nn-btn d-flex align-items-center gap-2 border-0" style={{ background: 'linear-gradient(135deg, #0d6efd, #6610f2)', color: 'white' }}>
                    <Radio size={18} /> Internal Broadcast
                </button>
            </div>

            {/* Stats Grid */}
            <div className="row g-4 mb-5">
                {data.stats.map((stat, index) => (
                    <div key={index} className="col-12 col-sm-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-4 h-100 transition-all hover-translate-y">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-4">
                                        {getStatIcon(stat.id)}
                                    </div>
                                    <span className={`nn-badge ${stat.trend?.startsWith('+') ? 'nn-badge-success' : stat.trend === 'Stable' ? 'bg-light text-secondary' : 'nn-badge-danger'}`}>
                                        {stat.trend?.startsWith('+') ? <ArrowUpRight size={12} className="me-1" /> : stat.trend?.startsWith('-') ? <ArrowDownRight size={12} className="me-1" /> : null}
                                        {stat.trend || 'N/A'}
                                    </span>
                                </div>
                                <h3 className="h6 text-secondary fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>{stat.label}</h3>
                                <div className="h2 fw-black text-dark mb-0">{stat.value}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 mb-5">
                {/* Metrics Chart */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h2 className="h6 fw-bolder text-dark mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Engagement Metrics</h2>
                                <div className="d-flex gap-3">
                                    <div className="d-flex align-items-center gap-2 small fw-bold text-secondary">
                                        <div className="rounded-circle" style={{ width: '8px', height: '8px', background: '#0d6efd' }}></div> Intake
                                    </div>
                                    <div className="d-flex align-items-center gap-2 small fw-bold text-secondary">
                                        <div className="rounded-circle" style={{ width: '8px', height: '8px', background: '#6610f2' }}></div> Outflow
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-4 pt-5">
                            <div className="d-flex align-items-end justify-content-between h-100" style={{ minHeight: '300px' }}>
                                {data.chartData.map((d, i) => (
                                    <div key={i} className="d-flex flex-column align-items-center gap-3 flex-grow-1">
                                        <div className="d-flex gap-1 align-items-end w-100 justify-content-center" style={{ height: '200px' }}>
                                            <div className="rounded-top shadow-sm transition-all" style={{ width: '12px', height: `${d.p}%`, background: 'linear-gradient(to top, #0d6efd, #3d8bfd)' }} title={`Intake: ${d.p}`}></div>
                                            <div className="rounded-top shadow-sm transition-all" style={{ width: '12px', height: `${d.s}%`, background: 'linear-gradient(to top, #6610f2, #8f50f7)' }} title={`Outflow: ${d.s}`}></div>
                                        </div>
                                        <span className="text-secondary small fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-transparent border-0 p-4 pb-0">
                            <h2 className="h6 fw-bolder text-dark mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Active Tasks</h2>
                        </div>
                        <div className="card-body p-4 pt-4">
                            <div className="d-flex flex-column gap-3">
                                {data.tasks.map((task, i) => (
                                    <div key={i} className="bg-light p-3 rounded-4 border-start border-4 border-primary shadow-xs transition-all hover-translate-x">
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <h4 className="h6 fw-bolder text-dark mb-0" style={{ fontSize: '0.9rem' }}>{task.title}</h4>
                                            <span className={`nn-badge ${task.priority === 'High' ? 'nn-badge-danger' : task.priority === 'Medium' ? 'nn-badge-warning' : 'nn-badge-info'}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <p className="text-secondary small mb-0 fw-medium">{task.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operations Nexus & System Logs */}
            <div className="row g-4">
                <div className="col-12 col-xl-8">
                    <div className="mb-4">
                        <h2 className="h5 fw-black text-dark mb-4">Operations Nexus</h2>
                        <div className="row g-3">
                            {modules.map((mod, index) => (
                                <div key={index} className="col-12 col-md-6">
                                    <Link to={mod.path} className="card border-0 shadow-sm rounded-4 text-decoration-none h-100 transition-all hover-translate-y">
                                        <div className="card-body p-4 d-flex align-items-center gap-4">
                                            <div className={`bg-${mod.color} bg-opacity-10 text-${mod.color} p-3 rounded-4 flex-shrink-0`}>
                                                {mod.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="h6 fw-bolder text-dark mb-1">{mod.title}</h3>
                                                <p className="text-secondary small mb-0 fw-medium text-truncate">{mod.desc}</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-4">
                    <h2 className="h5 fw-black text-dark mb-4">System Logs</h2>
                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4 d-flex flex-column gap-3">
                            <div className="activity-list overflow-y-auto custom-scrollbar pe-2" style={{ maxHeight: '380px' }}>
                                {data.activities.map((act, index) => (
                                    <div key={index} className="border-bottom border-light pb-3 mb-3 last-mb-0 last-pb-0">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <div className={`rounded-circle ${act.type === 'error' ? 'bg-danger' : 'bg-success'}`} style={{ width: '6px', height: '6px' }}></div>
                                            <span className="text-secondary small fw-bold" style={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>[{act.time}]</span>
                                        </div>
                                        <p className={`small mb-0 fw-medium ${act.type === 'error' ? 'text-danger' : 'text-dark'}`} style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                            {act.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <button className="nn-btn nn-btn-secondary text-uppercase mt-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                                                Access Full Audit Trail
                                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .fw-black { font-weight: 900; }
                .hover-translate-y:hover { transform: translateY(-5px); box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1) !important; }
                .hover-translate-x:hover { transform: translateX(5px); }
                .shadow-xs { box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .last-mb-0:last-child { margin-bottom: 0 !important; }
                .last-pb-0:last-child { padding-bottom: 0 !important; border-bottom: 0 !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
