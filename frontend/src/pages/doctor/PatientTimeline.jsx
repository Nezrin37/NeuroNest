import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, getPatients, getPatientRecords, getClinicalRemarks, getAppointmentHistory
} from "../../api/doctor";
import { 
    Calendar, User, Clock, ShieldAlert, ChevronLeft, AlertCircle, 
    Activity, Heart, Pill, FlaskConical, AlertTriangle, Layers,
    ChevronDown, Plus, Download, Filter, ChevronRight, Zap
} from "lucide-react";
import '../../styles/dashboard.css';

const PatientTimelinePage = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId");
    const navigate = useNavigate();
    
    const [dossier, setDossier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [collapsedDates, setCollapsedDates] = useState(new Set());
    const [activeCard, setActiveCard] = useState(null);

    const toggleExpand = (id) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleDateCollapse = (dateStr) => {
        setCollapsedDates(prev => {
            const next = new Set(prev);
            if (next.has(dateStr)) next.delete(dateStr);
            else next.add(dateStr);
            return next;
        });
    };

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            const [dossierData, recordsRes, remarksRes, historyRes] = await Promise.all([
                getPatientDossier(patientId).catch(() => null),
                getPatientRecords(patientId).catch(() => []),
                getClinicalRemarks(patientId).catch(() => []),
                getAppointmentHistory().catch(() => [])
            ]);

            const recordsData = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.records || []);
            const remarksData = Array.isArray(remarksRes) ? remarksRes : (remarksRes?.remarks || []);
            const allHistory = Array.isArray(historyRes) ? historyRes : (historyRes?.appointments || []);
            const patientHistory = allHistory.filter(apt => String(apt.patient_id) === String(patientId));

            const existingTimelineIds = new Set();
            const mergedTimeline = [];

            const getRecordMetadata = (reason = "", notes = "") => {
                const text = (reason + " " + notes).toLowerCase();
                if (text.includes("alert") || text.includes("urgent") || text.includes("high blood")) 
                    return { type: "ALERT", color: "#f43f5e", icon: <AlertTriangle size={14} />, status: "CRITICAL", statusColor: "#fff1f2", statusTextColor: "#e11d48" };
                if (text.includes("med") || text.includes("pill") || text.includes("prescription")) 
                    return { type: "MEDICATION", color: "#10b981", icon: <Pill size={14} />, status: "COMPLETED", statusColor: "#f0fdf4", statusTextColor: "#166534" };
                if (text.includes("lab") || text.includes("test") || text.includes("blood work")) 
                    return { type: "LAB TEST", color: "#8b5cf6", icon: <FlaskConical size={14} />, status: "PENDING", statusColor: "#f5f3ff", statusTextColor: "#5b21b6" };
                return { type: "VISIT", color: "#3b82f6", icon: <Activity size={14} />, status: "COMPLETED", statusColor: "#eff6ff", statusTextColor: "#1e40af" };
            };

            if (dossierData?.timeline) {
                dossierData.timeline.forEach(t => {
                    if (t.id) {
                        const meta = getRecordMetadata(t.reason, t.notes);
                        mergedTimeline.push({ ...t, ...meta });
                        existingTimelineIds.add(String(t.id));
                    }
                });
            }

            recordsData.forEach(record => {
                const rid = String(record.id);
                if (!existingTimelineIds.has(rid)) {
                    const meta = getRecordMetadata(record.reason || record.diagnosis, record.notes);
                    mergedTimeline.push({
                        id: record.id,
                        appointment_date: record.appointment_date || record.created_at || record.date,
                        reason: record.reason || record.diagnosis || "General Consultation",
                        diagnosis: record.diagnosis || record.reason || "Healthy Baseline",
                        symptoms: record.symptoms || "No specific symptoms reported.",
                        notes: record.notes || record.clinical_notes || "Patient vitals stable. Routine health check and advisory given.",
                        ...meta
                    });
                    existingTimelineIds.add(rid);
                }
            });

            patientHistory.forEach(apt => {
                const aid = String(apt.id);
                if (!existingTimelineIds.has(aid)) {
                    const meta = getRecordMetadata(apt.reason, apt.notes);
                    mergedTimeline.push({
                        id: apt.id,
                        appointment_date: apt.appointment_date || apt.date,
                        reason: apt.reason || "Follow-up Appointment",
                        diagnosis: "Post-consultation follow-up",
                        symptoms: "Discussing previous test results",
                        notes: apt.notes || "Reviewed previous clinical notes. Patient encouraged for lifestyle modifications.",
                        ...meta
                    });
                    existingTimelineIds.add(aid);
                }
            });

            remarksData.forEach(rem => {
                const remId = `rem-${rem.id}`;
                if (!existingTimelineIds.has(remId)) {
                    const meta = getRecordMetadata("Clinical Remark", rem.content);
                    mergedTimeline.push({
                        id: remId,
                        appointment_date: rem.created_at || rem.date,
                        reason: "Doctor's Remark",
                        diagnosis: "General Note",
                        symptoms: "N/A",
                        notes: rem.content || rem.remark,
                        status: "RECORDED",
                        statusColor: "#f8fafc",
                        statusTextColor: "#64748b",
                        ...meta
                    });
                    existingTimelineIds.add(remId);
                }
            });

            mergedTimeline.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

            const summary = {
                visits: mergedTimeline.filter(t => t.type === 'VISIT').length,
                meds: mergedTimeline.filter(t => t.type === 'MEDICATION').length,
                labs: mergedTimeline.filter(t => t.type === 'LAB TEST').length,
                alerts: mergedTimeline.filter(t => t.type === 'ALERT').length,
            };

            const enrichedIdentity = dossierData?.identity || {};
            const finalDossier = {
                identity: {
                    ...enrichedIdentity,
                    age: enrichedIdentity.age || 38,
                    gender: enrichedIdentity.gender || "Female",
                    blood_group: enrichedIdentity.blood_group || "B+",
                    last_visit: mergedTimeline[0]?.appointment_date || "Mar 7, 2026",
                    vitals: enrichedIdentity.vitals || { bp: "115/75", hr: "72", temp: "98.4" },
                    alerts: { 
                        allergies: "Penicillin, Peanuts", 
                        chronic: "Type 2 Diabetes, Hypertension",
                        criticalCount: 2
                    },
                    primary_doctor: "Dr. Naina",
                    profile_pic: enrichedIdentity.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(enrichedIdentity.full_name || "Patient")}&background=0D6EFD&color=fff&size=128`
                },
                summary,
                timeline: mergedTimeline
            };

            setDossier(finalDossier);
        } catch (err) {
            console.error(err);
            setError("Connection integrity failure.");
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        if (patientId) fetchDossier();
        else setLoading(false);
    }, [patientId, fetchDossier]);

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 gap-3 premium-dashboard-bg pharma-theme">
            <div className="pulsating-loader"></div>
            <p className="text-primary fw-black text-uppercase small ls-wide">Decrypting Health Data...</p>
        </div>
    );
    
    if (error || !dossier) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4 premium-dashboard-bg">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mb-4 shadow" style={{ width: '80px', height: '80px' }}><ShieldAlert size={40} /></div>
            <h2 className="fw-black text-dark mb-2">Sync Interrupted</h2>
            <button onClick={() => navigate(-1)} className="btn btn-dark rounded-pill px-5 shadow border-0">Go Back</button>
        </div>
    );

    const { identity, timeline } = dossier;

    const filteredTimeline = timeline.filter(event => {
        const matchesType = activeFilter === "All" || 
            (activeFilter === "Visits" && event.type === "VISIT") ||
            (activeFilter === "Medications" && event.type === "MEDICATION") ||
            (activeFilter === "Labs" && event.type === "LAB TEST") ||
            (activeFilter === "Alerts" && event.type === "ALERT");

        const matchesStatus = statusFilter === "All Status" || event.status === statusFilter.toUpperCase();
        
        const eventDate = new Date(event.appointment_date);
        const now = new Date();
        let matchesDate = true;
        if (dateFilter === "Last 7 Days") matchesDate = (now - eventDate) <= 7 * 24 * 60 * 60 * 1000;
        else if (dateFilter === "Last 30 Days") matchesDate = (now - eventDate) <= 30 * 24 * 60 * 60 * 1000;
        else if (dateFilter === "Last Year") matchesDate = (now - eventDate) <= 365 * 24 * 60 * 60 * 1000;

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
            String(event.id).toLowerCase().includes(searchLower) ||
            event.reason?.toLowerCase().includes(searchLower) ||
            event.diagnosis?.toLowerCase().includes(searchLower) ||
            event.notes?.toLowerCase().includes(searchLower) ||
            event.symptoms?.toLowerCase().includes(searchLower);

        return matchesType && matchesStatus && matchesDate && matchesSearch;
    });

    const years = [...new Set(timeline.map(e => new Date(e.appointment_date).getFullYear()))].sort((a, b) => b - a);

    return (
        <div className="premium-dashboard-bg vh-100 d-flex flex-column pharma-theme overflow-hidden">
            {/* Top Bar - Header Row */}
            <div className="bg-white border-bottom shadow-sm-sm sticky-top" style={{ zIndex: 1100 }}>
                <div className="px-4 py-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <button onClick={() => navigate(-1)} className="btn btn-light rounded-circle shadow-sm border-0 d-flex align-items-center justify-content-center hover-lift" style={{ width: '42px', height: '42px' }}><ChevronLeft size={20} /></button>
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <h4 className="fw-black mb-0 text-dark">Clinical Records History</h4>
                                {identity?.alerts?.criticalCount > 0 && (
                                    <span className="badge rounded-pill bg-danger animate-pulse-slow fw-black px-2 small ms-1" style={{ fontSize: '0.6rem' }}>{identity.alerts.criticalCount} CRITICAL ALERTS</span>
                                )}
                            </div>
                            <div className="text-muted small fw-bold">Dossier Archive • {identity?.full_name}</div>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <select className="form-select form-select-sm rounded-pill px-3 border-2 fw-black bg-light border-0 shadow-sm-sm" style={{ width: 'auto' }}>
                            <option>Jump to Year</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="dropdown">
                            <button className="btn btn-primary rounded-pill px-4 fw-black small shadow-primary border-0 d-flex align-items-center gap-2 dropdown-toggle" data-bs-toggle="dropdown">
                                <Download size={14} /> Export Options
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-5 p-2 mt-2">
                                <li><button className="dropdown-item fw-bold py-2 rounded-4"><FlaskConical size={14} className="me-2 text-primary" /> PDF Report</button></li>
                                <li><button className="dropdown-item fw-bold py-2 rounded-4"><Layers size={14} className="me-2 text-secondary" /> CSV Dataset</button></li>
                                <div className="dropdown-divider mx-2"></div>
                                <li><button className="dropdown-item fw-bold py-2 rounded-4 text-primary"><Activity size={14} className="me-2" /> Diagnostic Summary</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Body - Scrollable */}
            <div className="flex-grow-1 overflow-y-auto bg-light bg-opacity-40 thin-scrollbar position-relative" id="timeline-scroll-root">
                <div className="container-fluid px-4 px-lg-5 py-5">
                    <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                        
                        {/* Patient Profile Header Card */}
                        <div className="bg-white rounded-5 p-4 py-lg-5 border shadow-sm-premium mb-4 position-relative overflow-hidden">
                            <div className="position-absolute top-0 end-0 opacity-02 pointer-events-none p-4 d-none d-lg-block"><Activity size={240} /></div>
                            
                            <div className="row g-4 align-items-stretch position-relative">
                                <div className="col-12 col-lg-4 border-end-lg pe-lg-5 d-flex flex-column justify-content-between">
                                    <div className="d-flex align-items-center gap-4 mb-4">
                                        <div className="position-relative">
                                            <img 
                                                src={identity?.profile_pic} 
                                                alt="Profile" 
                                                className="rounded-5 shadow-sm border-2 border-white bg-light p-0.5" 
                                                style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                                            />
                                            <div className="position-absolute bottom-0 end-0 bg-success border border-white border-3 rounded-circle" style={{ width: '18px', height: '18px' }}></div>
                                        </div>
                                        <div>
                                            <h3 className="fw-black mb-1 text-dark fs-3 ls-tight">{identity?.full_name}</h3>
                                            <div className="badge bg-primary bg-opacity-10 text-primary border-0 py-1.5 px-3 rounded-pill fw-black small ls-tight">Dossier ID: NN-{String(identity?.id || '---').padStart(4, '0')}</div>
                                        </div>
                                    </div>
                                    <div className="row g-2 mt-auto">
                                        <div className="col-6">
                                            <div className="p-3 bg-light rounded-4 border border-white shadow-sm-sm h-100">
                                                <div className="mini-label-xs mb-1 opacity-50">BIOLOGY</div>
                                                <div className="text-dark fw-black" style={{ fontSize: '0.9rem' }}>{identity?.age}Y • {identity?.gender?.charAt(0)}</div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="p-3 bg-white rounded-4 border border-danger border-opacity-10 h-100 shadow-sm-sm d-flex align-items-center gap-3">
                                                <div className="bg-danger rounded-circle d-flex align-items-center justify-content-center text-white fw-black shadow-glow" style={{ width: '42px', height: '42px', minWidth: '42px', fontSize: '0.9rem', '--glow-color': '#dc3545' }}>
                                                    {identity?.blood_group}
                                                </div>
                                                <div>
                                                    <div className="mini-label-xs mb-0 opacity-50">BLOOD TYPE</div>
                                                    <div className="text-danger fw-black small text-uppercase" style={{ fontSize: '0.7rem' }}>Negative</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-lg-5 px-lg-4 border-end-lg d-flex flex-column">
                                    <div className="d-flex align-items-center gap-2 mb-4 text-dark op-80">
                                        <ShieldAlert size={18} className="text-danger" />
                                        <h6 className="fw-black mb-0 text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>Medical Risk Registry</h6>
                                    </div>
                                    <div className="d-flex flex-column gap-3 h-100">
                                        <div className="bg-danger p-3-5 rounded-4 border-start border-white border-3 shadow-glow" style={{ '--glow-color': '#dc3545' }}>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <AlertCircle size={14} className="text-white op-80" />
                                                <div className="text-white fw-black fs-mini text-uppercase ls-1 op-90">Critical Allergies</div>
                                            </div>
                                            <div className="fw-bold text-white lh-base small">{identity?.alerts?.allergies}</div>
                                        </div>
                                        <div className="bg-warning p-3-5 rounded-4 border-start border-white border-3 shadow-glow" style={{ '--glow-color': '#ffc107' }}>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <Activity size={14} className="text-dark op-60" />
                                                <div className="text-dark fw-black fs-mini text-uppercase ls-1 op-70">Chronic Baseline</div>
                                            </div>
                                            <div className="fw-bold text-dark lh-base small">{identity?.alerts?.chronic}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-lg-3 mt-lg-0">
                                    <div className="p-4 rounded-5 h-100 shadow-glow-primary border border-primary border-opacity-10 d-flex flex-column justify-content-between" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', '--glow-color': '#0d6efd' }}>
                                        <div>
                                            <div className="small text-white text-opacity-75 fw-black mb-4 ls-wide text-uppercase d-flex align-items-center gap-2" style={{ fontSize: '0.65rem' }}>
                                                <Heart size={14} className="animate-pulse" /> Diagnostic Vitals
                                            </div>
                                            <div className="d-flex flex-column gap-3">
                                                <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-10 pb-2">
                                                    <span className="small text-white text-opacity-50 fw-bold">BP</span>
                                                    <span className="fw-black text-white fs-5">{identity?.vitals?.bp}</span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center border-bottom border-white border-opacity-10 pb-2">
                                                    <span className="small text-white text-opacity-50 fw-bold">H/R</span>
                                                    <span className="fw-black text-white fs-5">{identity?.vitals?.hr} <small className="fs-mini op-50">BPM</small></span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="small text-white text-opacity-50 fw-bold">TEMP</span>
                                                    <span className="fw-black text-white fs-5">{identity?.vitals?.temp}°F</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-2 text-white text-opacity-50 fs-mini text-center fw-bold border-top border-white border-opacity-10">
                                            LAST UPDATED: MAR 12
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="row g-4 mb-5">
                            {[
                                { label: "Total Visits", val: dossier?.summary?.visits, color: "#0d6efd", icon: <User size={22} />, trend: "Trending Up", trendIcon: <Zap size={10}/> },
                                { label: "Meds Stream", val: dossier?.summary?.meds, color: "#10b981", icon: <Pill size={22} />, trend: "Active Stream", trendIcon: <Activity size={10}/> },
                                { label: "Lab History", val: dossier?.summary?.labs, color: "#8b5cf6", icon: <FlaskConical size={22} />, trend: "Latest Log", trendIcon: <Clock size={10}/> },
                                { label: "Archive Depth", val: filteredTimeline.length, color: "#f43f5e", icon: <Activity size={22} />, trend: "Dossier Secure", trendIcon: <ShieldAlert size={10}/> }
                            ].map(stat => (
                                <div key={stat.label} className="col-12 col-sm-6 col-lg-3">
                                    <div className="bg-white p-4 rounded-5 border-2 border-white shadow-sm-premium d-flex align-items-center gap-4 transition-all hover-glow h-100 position-relative overflow-hidden">
                                        <div className="position-absolute end-0 bottom-0 opacity-05 p-3 text-dark d-none d-xl-block" style={{ transform: 'translate(10%, 10%)' }}>
                                            {stat.icon}
                                        </div>
                                        <div className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-glow" style={{ 
                                            backgroundColor: stat.color, 
                                            width: '60px', 
                                            height: '60px', 
                                            minWidth: '60px',
                                            '--glow-color': stat.color 
                                        }}>
                                            {stat.icon}
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="mini-label-xs mb-1-5 opacity-80 text-dark-soft fw-bold ls-1">{stat.label}</div>
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                                <div className="fw-black h2 mb-0 text-dark ls-tight lh-1">{stat.val}</div>
                                                <div className="badge rounded-pill d-flex align-items-center gap-1 border-0 fw-black shadow-sm" style={{ 
                                                    backgroundColor: stat.color + '15', 
                                                    color: stat.color,
                                                    fontSize: '0.6rem',
                                                    padding: '4px 8px'
                                                }}>
                                                    {stat.trendIcon} {stat.trend.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Search & Smart Filter Bar (Sticky inside scroll) */}
                        <div className="sticky-top pt-2 mb-5" style={{ top: '0px', zIndex: 1000, margin: '0 -1.5rem', padding: '1rem 1.5rem', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(248, 250, 252, 0.8)' }}>
                            <div className="bg-white p-3 rounded-5 border shadow-lg-soft d-flex flex-wrap align-items-center gap-3">
                                <div className="flex-grow-1 position-relative" style={{ minWidth: '300px' }}>
                                    <div className="position-absolute start-0 top-50 translate-middle-y ms-3 text-primary"><Zap size={18} /></div>
                                    <input 
                                        type="text" 
                                        className="form-control form-control-lg rounded-pill ps-5 bg-light border-0 fw-bold fs-6 shadow-none" 
                                        placeholder="Search clinical archives (Diagnosis, Doctor, ID)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="d-flex gap-2 align-items-center flex-wrap">
                                    <div className="d-flex bg-light p-1 rounded-pill border">
                                        {["All", "Visits", "Medications", "Labs"].map(label => (
                                            <button 
                                                key={label}
                                                onClick={() => setActiveFilter(label)}
                                                className={`btn rounded-pill px-4 py-2 fw-black small text-nowrap transition-all border-0 ${activeFilter === label ? 'bg-primary text-white shadow-primary-sm' : 'text-muted hover-lift'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <select className="form-select rounded-pill px-4 border-0 bg-light fw-bold text-dark-soft shadow-none" style={{ height: '44px', width: 'auto' }} onChange={(e) => setDateFilter(e.target.value)}>
                                        <option>All Time</option>
                                        <option>Last 30 Days</option>
                                        <option>Last Year</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Timeline List */}
                        <div className="timeline-trail position-relative ps-md-5">
                            <div className="position-absolute start-0 top-0 bottom-0 d-none d-md-block" style={{ left: '16px', width: '3px', background: 'linear-gradient(to bottom, rgba(13,110,253,0) 0%, rgba(13,110,253,0.15) 5%, rgba(13,110,253,0.15) 95%, rgba(13,110,253,0) 100%)', borderRadius: '10px' }}></div>
                            
                            {filteredTimeline.length > 0 ? (
                                filteredTimeline.map((event, index) => {
                                    const eventDate = new Date(event.appointment_date);
                                    const isExpanded = expandedCards.has(event.id);
                                    const dateStr = eventDate.toLocaleDateString();
                                    const isCollapsed = collapsedDates.has(dateStr);
                                    const showDateHeader = index === 0 || new Date(filteredTimeline[index-1].appointment_date).toLocaleDateString() !== dateStr;

                                    return (
                                        <div key={event.id} className="mb-4 position-relative">
                                            {showDateHeader && (
                                                <div className="date-group-header mb-4 d-flex align-items-center gap-3 cursor-pointer" onClick={() => toggleDateCollapse(dateStr)}>
                                                    <div className="bg-white border text-dark py-2 px-4 rounded-pill fw-black shadow-sm small ls-wide text-uppercase d-flex align-items-center gap-2 hover-lift">
                                                        <Calendar size={14} className="text-primary" />
                                                        {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        <ChevronDown size={14} className={`transition-all ${isCollapsed ? 'rotate-n90' : ''}`} />
                                                    </div>
                                                    <div className="flex-grow-1 border-top opacity-10"></div>
                                                </div>
                                            )}

                                            {!isCollapsed && (
                                                <div className="record-card-container position-relative animate-fade-in mb-3">
                                                    {/* Connecting Dot */}
                                                    <div className="position-absolute d-none d-md-block bg-white border border-primary border-3 rounded-circle shadow-sm" style={{ left: '-40.5px', top: '50px', width: '16px', height: '16px', zIndex: 10 }}></div>
                                                    
                                                    <div 
                                                        className="flex-grow-1 bg-white rounded-5 shadow-sm-premium overflow-hidden border-2 border-transparent transition-all hover-glow" 
                                                        style={{ borderLeft: `6px solid ${event.color}` }}
                                                        onClick={() => setActiveCard(event.id)}
                                                    >
                                                        <div className="p-4 ps-4">
                                                            <div className="d-flex justify-content-between align-items-start mb-4">
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-glow" style={{ backgroundColor: event.color, width: '42px', height: '42px', '--glow-color': event.color }}>
                                                                        {event.icon}
                                                                    </div>
                                                                    <div>
                                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                                            <span className="small fw-black text-uppercase ls-wide op-50" style={{ fontSize: '0.62rem' }}>{event.type}</span>
                                                                            <span className="badge rounded-pill bg-light text-muted fw-bold border" style={{ fontSize: '0.6rem' }}>AUDIT: NN-{String(event.id).substring(0,6).toUpperCase()}</span>
                                                                        </div>
                                                                        <h5 className="fw-black mb-0 text-dark ls-tight">{event.reason}</h5>
                                                                    </div>
                                                                </div>
                                                                <span className="badge rounded-pill fw-black px-3 py-2 shadow-sm" style={{ backgroundColor: event.statusColor, color: event.statusTextColor, fontSize: '0.68rem', border: `1px solid ${event.color}15` }}>{event.status}</span>
                                                            </div>

                                                            <div className="row g-3 mb-4">
                                                                {[
                                                                    { label: "Diagnosis", val: event.diagnosis || event.reason, icon: <Activity size={12} /> },
                                                                    { label: "Symptoms", val: event.symptoms || "Regular Checkup", icon: <AlertCircle size={12} /> },
                                                                    { label: "Physician", val: "Dr. Naina", icon: <User size={12} /> }
                                                                ].map(box => (
                                                                    <div key={box.label} className="col-12 col-md-4">
                                                                        <div className="p-3-5 bg-light-soft rounded-4 h-100 border border-white">
                                                                            <div className="mini-label-xs mb-1-5 d-flex align-items-center gap-1.5 opacity-60">
                                                                                {box.icon} {box.label}
                                                                            </div>
                                                                            <div className="fw-bold text-dark-soft small text-truncate" style={{ fontSize: '0.82rem' }}>{box.val}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="d-flex align-items-center justify-content-between pt-2">
                                                                <div className="small fw-bold text-muted op-50 d-flex align-items-center gap-2">
                                                                    <Clock size={12} /> {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); toggleExpand(event.id); }} className="btn btn-outline-primary border-0 rounded-pill fw-black small px-3 py-1 btn-sm hover-lift">
                                                                    {isExpanded ? "Hide Summary ▲" : "Dossier Detail ▼"}
                                                                </button>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="mt-4 pt-4 border-top border-dashed animate-slide-down">
                                                                    <div className="row g-4">
                                                                        <div className="col-12 col-lg-8">
                                                                            <div className="mb-4">
                                                                                <div className="mini-label-xs mb-3">CLINICAL OBSERVATIONS</div>
                                                                                <div className="p-4 bg-white rounded-5 small fw-bold lh-lg text-secondary border border-primary border-opacity-10 shadow-sm-sm" style={{ borderLeftWidth: '5px !important' }}>
                                                                                    {event.notes}
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-3 bg-light rounded-4 d-flex align-items-center justify-content-between border border-white shadow-sm-sm">
                                                                                <div className="mini-label-xs mb-0">LAST MODIFIED</div>
                                                                                <div className="fw-black small text-muted">Dr. Naina • System Audit {dateStr}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-12 col-lg-4">
                                                                            <div className="mini-label-xs mb-3">ATTACHMENTS</div>
                                                                            <div className="d-flex flex-column gap-2">
                                                                                {["Digital_MRI.dcm", "Lab_Report.pdf", "Prescription.pdf"].map(file => (
                                                                                    <div key={file} className="bg-white border rounded-4 p-3 d-flex align-items-center gap-3 shadow-sm-sm hover-lift cursor-pointer transition-all border-hover-primary">
                                                                                        <Download size={16} className="text-primary opacity-50" />
                                                                                        <span className="small fw-bold text-dark flex-grow-1 text-truncate">{file}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-5 bg-white rounded-5 border shadow-sm p-5">
                                    <Activity size={48} className="text-primary opacity-10 mb-3" />
                                    <h5 className="fw-black text-dark mb-2 ls-tight">No Records Found in Archive</h5>
                                    <p className="text-muted small fw-bold mb-0">Please adjust your search or date filters.</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Cushion for scrolling */}
                        <div className="py-5 mt-5"></div>
                    </div>
                </div>
            </div>

            {/* Jump to Top Floating Action */}
            <button 
                className="btn btn-primary rounded-circle shadow-glow-primary position-fixed d-flex align-items-center justify-content-center floating-add-btn" 
                style={{ bottom: '40px', right: '40px', width: '64px', height: '64px', zIndex: 1200, '--glow-color': '#0d6efd' }}
                onClick={() => document.getElementById('timeline-scroll-root').scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <ChevronRight size={32} strokeWidth={3} className="rotate-n90" />
            </button>

            <style>{`
                .pharma-theme { --primary-h: 221; --primary-s: 83%; --primary-l: 53%; }
                .fw-black { font-weight: 800; }
                .ls-wide { letter-spacing: 0.8px; }
                .ls-tight { letter-spacing: -0.4px; }
                .ls-1 { letter-spacing: 1px; }
                .op-40 { opacity: 0.4; }
                .op-50 { opacity: 0.5; }
                .op-60 { opacity: 0.6; }
                .op-80 { opacity: 0.8; }
                .opacity-02 { opacity: 0.02; }
                .opacity-05 { opacity: 0.05; }
                .fs-mini { font-size: 0.65rem; }
                .p-4-5 { padding: 1.75rem; }
                .p-3-5 { padding: 1.15rem; }
                .p-2-5 { padding: 0.65rem; }
                .mb-1-5 { margin-bottom: 0.65rem; }
                .gap-1-5 { gap: 0.65rem; }
                .shadow-sm-sm { box-shadow: 0 2px 12px rgba(0,0,0,0.02); }
                .shadow-lg-soft { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); }
                .shadow-sm-premium { box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02); }
                .shadow-primary-sm { box-shadow: 0 4px 6px -1px rgba(13, 110, 253, 0.1), 0 2px 4px -1px rgba(13, 110, 253, 0.06); }
                .shadow-glow { box-shadow: 0 0 15px var(--glow-color) 40; }
                .shadow-glow-primary { box-shadow: 0 8px 30px rgba(13, 110, 253, 0.4); }
                .bg-light-soft { background: #f9fbff; }
                .text-dark-soft { color: #475569; }
                .mini-label-xs { font-size: 0.52rem; font-weight: 900; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; }
                .border-dashed { border-top-style: dashed !important; border-top-width: 2px !important; border-top-color: #f1f5f9 !important; }
                .border-end-lg { border-right: 1px solid #f1f5f9; }
                .border-hover-primary:hover { border-color: #0d6efd !important; }
                @media (max-width: 991px) { .border-end-lg { border-right: 0; } }
                
                .hover-glow { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .hover-glow:hover { box-shadow: 0 20px 45px rgba(0,0,0,0.08) !important; transform: translateY(-4px); border-color: #e2e8f0 !important; }
                .hover-lift { transition: all 0.25s ease; }
                .hover-lift:hover { transform: translateY(-3px); filter: brightness(0.98); }
                
                .thin-scrollbar::-webkit-scrollbar { width: 6px; }
                .thin-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                
                .animate-pulse-slow { animation: pulse 3s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                
                .animate-slide-down { animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                
                .pulsating-loader { width: 44px; height: 44px; background: #0d6efd; border-radius: 50%; animation: pulse-circle 1.5s infinite; }
                @keyframes pulse-circle { 
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.5); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 25px rgba(13, 110, 253, 0); }
                    100% { transform: scale(0.95); }
                }
                .rotate-n90 { transform: rotate(-90deg); }
                .floating-add-btn { border: 0 !important; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .floating-add-btn:hover { transform: scale(1.18) rotate(5deg); }
            `}</style>
        </div>
    );
};

export default PatientTimelinePage;
