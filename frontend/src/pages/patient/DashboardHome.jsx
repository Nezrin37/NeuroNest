import React, { useState, useEffect } from "react";
import { Activity, Calendar, Bell, Heart, TrendingUp, ShieldCheck, Clock, X } from "lucide-react";
import { getMyNotifications, markNotificationRead } from "../../api/profileApi";
import { Link } from "react-router-dom";

const DashboardHome = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await getMyNotifications(true);
                setNotifications(data || []);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const stats = [
        { label: "Health Score", value: "94/100", icon: <Heart size={20} />, color: "danger", trend: "+2%" },
        { label: "Active Plans", value: "3", icon: <Activity size={20} />, color: "primary", trend: "On track" },
        { label: "Next Checkup", value: "In 4 Days", icon: <Calendar size={20} />, color: "success", trend: "Scheduled" },
    ];

    return (
        <div className="py-2">
            {/* Welcome Section */}
            <div className="card border-0 rounded-4 overflow-hidden mb-5 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #6610f2)' }}>
                <div className="card-body p-4 p-md-5 text-white position-relative">
                    <div className="position-relative z-1">
                        <h1 className="display-5 fw-black mb-2" style={{ letterSpacing: '-1px' }}>Welcome back, Jane 👋</h1>
                        <p className="lead opacity-75 mb-4 fw-medium">Your health journey is progressing beautifully. Here's your overview for today.</p>
                        <div className="d-flex flex-wrap gap-3">
                            <button className="btn btn-white rounded-pill px-4 fw-bold shadow-sm border-0">View Health Report</button>
                            <button className="btn btn-outline-light rounded-pill px-4 fw-bold">Emergency SOS</button>
                        </div>
                    </div>
                    <div className="position-absolute top-0 end-0 opacity-10 p-5 d-none d-lg-block">
                        <Activity size={200} strokeWidth={1} />
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="row g-4 mb-5">
                {stats.map((stat, i) => (
                    <div key={i} className="col-12 col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100 transition-all hover-translate-y">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} p-3 rounded-4`}>
                                        {stat.icon}
                                    </div>
                                    <span className="badge rounded-pill bg-light text-secondary small fw-bold px-2 py-1">
                                        {stat.trend}
                                    </span>
                                </div>
                                <div className="small fw-bold text-uppercase text-secondary mb-1" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>{stat.label}</div>
                                <div className="h3 fw-black text-dark mb-0">{stat.value}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Sections Grid */}
            <div className="row g-4">
                {/* Health Summary */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="h5 fw-black text-dark mb-0">Health Summary</h2>
                                <button className="btn btn-link text-primary text-decoration-none fw-bold p-0">Detailed Analysis</button>
                            </div>
                            
                            <div className="p-5 text-center bg-light rounded-4 border border-dashed text-secondary">
                                <TrendingUp size={48} className="mb-3 opacity-25" />
                                <h3 className="h6 fw-bold mb-1">Vitality Metrics Loading...</h3>
                                <p className="small mb-0">We're synchronizing your latest clinic results from the South Sector lab.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity / Alerts */}
                <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <h2 className="h5 fw-black text-dark mb-4">Reminders & Alerts</h2>
                            <div className="d-flex flex-column gap-3">
                                {notifications.length > 0 ? (
                                    notifications.map(n => {
                                        const isUrgent = n.message.toLowerCase().includes("urgent") || n.message.toLowerCase().includes("priority");
                                        const isActionRequired = n.type === 'appointment_rescheduled';
                                        
                                        return (
                                            <div key={n.id} className={`d-flex gap-3 align-items-start p-3 rounded-4 border-start border-4 ${isUrgent ? 'bg-danger bg-opacity-10 border-danger' : isActionRequired ? 'bg-warning bg-opacity-10 border-warning' : 'bg-primary bg-opacity-10 border-primary'}`}>
                                                {isUrgent ? <ShieldCheck size={20} className="text-danger mt-1" /> : isActionRequired ? <Clock size={20} className="text-warning mt-1" /> : <Bell size={20} className="text-primary mt-1" />}
                                                <div className="flex-grow-1">
                                                    <div className="d-flex justify-content-between">
                                                        <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                                                            {n.title}
                                                            {isUrgent && <span className="badge bg-danger rounded-pill" style={{fontSize: '0.6rem'}}>PRIORITY</span>}
                                                        </div>
                                                        <button onClick={() => handleMarkRead(n.id)} className="btn btn-link p-0 text-muted" title="Dismiss"><X size={14}/></button>
                                                    </div>
                                                    <p className="small text-secondary mb-2 lh-sm">{n.message}</p>
                                                    {isActionRequired && (
                                                        <Link to="/patient/appointments" className="btn btn-warning btn-sm py-0 px-2 rounded-pill fw-bold" style={{fontSize: '0.7rem'}}>Review New Time</Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <>
                                        <div className="d-flex gap-3 align-items-start p-3 rounded-4 bg-primary bg-opacity-10 border-start border-4 border-primary">
                                            <ShieldCheck size={20} className="text-primary mt-1" />
                                            <div>
                                                <div className="fw-bold small text-dark">Insurance Verified</div>
                                                <p className="small text-secondary mb-0">Your medical coverage has been updated for the 2026 term.</p>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-3 align-items-start p-3 rounded-4 bg-light">
                                            <Calendar size={20} className="text-secondary mt-1" />
                                            <div>
                                                <div className="fw-bold small text-dark text-muted">No recent alerts</div>
                                                <p className="small text-secondary mb-0 opacity-50">You're all caught up with your notifications.</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .btn-white { background: white; color: #0d6efd; }
                .btn-white:hover { background: #f8f9fa; transform: scale(1.05); }
                .fw-black { font-weight: 950; }
                .hover-translate-y:hover { transform: translateY(-5px); }
                .border-dashed { border-style: dashed !important; }
            `}</style>
        </div>
    );
};

export default DashboardHome;
