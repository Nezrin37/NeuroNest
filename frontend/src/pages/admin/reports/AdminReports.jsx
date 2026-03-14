import React, { useState, useEffect, useRef } from 'react';
import axios from '../../../api/axios';
import { 
  Users, UserCheck, Activity, CalendarDays, CheckCircle2, 
  XSquare, Clock, Star, Download, Filter, ChevronDown 
} from 'lucide-react';
import AppointmentCharts from './components/AppointmentCharts';
import DoctorPerformanceTable from './components/DoctorPerformanceTable';
import GovernancePanel from './components/GovernancePanel';
import '../../../styles/admin-reports.css';

const AdminReports = () => {
    const [overview, setOverview] = useState(null);
    const [appointments, setAppointments] = useState(null);
    const [doctors, setDoctors] = useState(null);
    const [governance, setGovernance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(7);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Refs for outside click detection
    const exportRef = useRef(null);

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            // Fetch all data in parallel for maximum speed
            const [overviewRes, appointmentsRes, doctorsRes, governanceRes] = await Promise.all([
                axios.get('/api/admin/reports/overview'),
                axios.get(`/api/admin/reports/appointments?days=${days}`),
                axios.get('/api/admin/reports/doctors'),
                axios.get(`/api/admin/reports/governance?days=${days}`),
            ]);
                
                setOverview(overviewRes.data);
                setAppointments(appointmentsRes.data.daily_trends);
                setDoctors(doctorsRes.data);
                setGovernance(governanceRes.data);
            } catch (err) {
                console.error("Failed to load comprehensive analytics", err);
                setError(err.response ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message);
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        fetchAllReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    // Handle outside clicks to close menus
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportRef.current && !exportRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = (format = 'json') => {
        if (!overview || !appointments || !doctors || !governance) return;
        
        if (format === 'json') {
            const exportData = {
                generated_at: new Date().toISOString(),
                period_days: days,
                overview,
                appointments,
                doctors,
                governance
            };
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `enterprise_report_${days}d_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } else if (format === 'pdf') {
            const element = document.getElementById('admin-reports-content');
            const actions = document.getElementById('reports-header-actions');
            if (actions) actions.style.display = 'none';

            const opt = {
                margin:       10,
                filename:     `enterprise_report_${days}d_${new Date().toISOString().split('T')[0]}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            import('html2pdf.js').then(html2pdf => {
                html2pdf.default().set(opt).from(element).save().then(() => {
                    if (actions) actions.style.display = 'flex';
                });
            });
        }
        setShowExportMenu(false);
    };

    if (error) {
        return <div className="p-8 text-center text-red-500 font-bold">Error loading dashboard: {error}</div>;
    }

    const statCards = overview ? [
        { label: "Total Patients", value: overview.users.total_patients, icon: Users, color: "blue" },
        { label: "Active Doctors", value: overview.users.total_doctors, icon: UserCheck, color: "emerald" },
        { label: "All Appointments", value: overview.appointments.total, icon: Activity, color: "violet" },
        { label: "Appointments Today", value: overview.appointments.today, icon: CalendarDays, color: "fuchsia" },
        { label: "Completed Sessions", value: overview.appointments.completed, icon: CheckCircle2, color: "teal" },
        { label: "Pending Approvals", value: overview.appointments.pending, icon: Clock, color: "amber" },
        { label: "Cancellations", value: overview.appointments.cancelled, icon: XSquare, color: "rose" },
        { label: "Platform Rating", value: overview.reviews.average_rating, icon: Star, color: "yellow" },
    ] : [];

    return (
        <div className="admin-reports-root">
            <div className="admin-reports-header">
                <div className="header-top">
                    <div className="header-titles">
                        <h1>Enterprise Analytics & Governance</h1>
                        <p>Live system metrics, performance monitoring, and compliance oversight.</p>
                    </div>
                    
                    {/* Export Report Group */}
                    <div style={{ position: 'relative' }} ref={exportRef}>
                        <button 
                            type="button"
                            id="export-report-btn"
                            onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }} 
                            className={`btn-export-trigger ${showExportMenu ? 'active' : ''}`}
                        >
                            <Download size={15} strokeWidth={2.5} /> 
                            <span>Export Report</span>
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showExportMenu && (
                            <div className="reports-dropdown-menu absolute right-0 z-[1000] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                <div className="dropdown-header">
                                    Digital Output Format
                                </div>
                                <div className="selection-cards-grid">
                                    <button
                                        type="button"
                                        onClick={() => handleExport('json')}
                                        className="selection-card group outline-none"
                                    >
                                        <div className="card-icon">
                                            <Activity size={20} />
                                        </div>
                                        <div className="card-content">
                                            <span className="card-title">JSON Archive</span>
                                        </div>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => handleExport('pdf')}
                                        className="selection-card group outline-none"
                                    >
                                        <div className="card-icon">
                                            <Download size={20} />
                                        </div>
                                        <div className="card-content">
                                            <span className="card-title">PDF Document</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div id="reports-header-actions" className="header-actions">
                    <div className="filter-section w-full">
                        <span className="filter-label">Time Range Selection</span>
                        <div className="toggle-chips-container">
                            {[7, 15, 30, 90].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDays(d)}
                                    className={`toggle-chip ${days === d ? 'active' : ''}`}
                                >
                                    Last {d} Days
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="reports-loading-vault">
                    <div className="pulse-circle"></div>
                    <p>Aggregating System Metrics...</p>
                </div>
            ) : (
                <div id="admin-reports-content">
                    {/* SECTION 1: KPI OVERVIEW GRID */}
                    <div className="reports-kpi-grid">
                        {statCards.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div key={i} className={`kpi-card-glow theme-${stat.color}`}>
                                    <div className="kpi-icon-wrap">
                                        <Icon size={22} />
                                    </div>
                                    <div className="kpi-data">
                                        <span className="kpi-label">{stat.label}</span>
                                        <span className="kpi-value">{stat.value}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SECTION 2: CHARTS & GOVERNANCE */}
                    <div className="reports-bento-grid">
                        <div className="bento-box chart-box">
                            <div className="bento-header">
                                <h3>7-Day Appointment Velocity</h3>
                                <span className="nn-badge nn-badge-info">Volumetric</span>
                            </div>
                            <AppointmentCharts data={appointments} />
                        </div>

                        <div className="bento-box governance-box">
                            <div className="bento-header">
                                <h3>Risk & Oversight Summary</h3>
                                <span className="nn-badge nn-badge-danger">Security</span>
                            </div>
                            <GovernancePanel data={governance} />
                        </div>
                    </div>

                    {/* SECTION 3: DOCTOR PERFORMANCE TABLE */}
                    <div className="reports-lower-grid mt-4">
                        <div className="bento-box list-box w-full">
                            <div className="bento-header">
                                <h3>Clinical Force Performance matrix</h3>
                                <span className="nn-badge nn-badge-success">Efficiency</span>
                            </div>
                            <DoctorPerformanceTable doctors={doctors} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
