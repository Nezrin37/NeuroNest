import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, getPatients, getPatientRecords, getClinicalRemarks, getAppointmentHistory
} from "../../api/doctor";
import { 
    Calendar, User, Mail, Phone, Clock, Bookmark, 
    ShieldAlert, ChevronLeft, Check, X, AlertCircle, 
    Activity, Heart, Thermometer, Wind, Pill, 
    FlaskConical, AlertTriangle, Fingerprint, Layers,
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
    const [doctorFilter, setDoctorFilter] = useState("All Doctors");
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

            // Helper to determine record type and color
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

            // 1. Dossier Timeline
            if (dossierData?.timeline) {
                (dossierData.timeline || []).forEach(t => {
                    if (t.id) {
                        const meta = getRecordMetadata(t.reason, t.notes);
                        mergedTimeline.push({ ...t, ...meta });
                        existingTimelineIds.add(String(t.id));
                    }
                });
            }

            // 2. Patient Records
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
                        ...meta,
                        isLegacyRecord: true
                    });
                    existingTimelineIds.add(rid);
                }
            });

            // 3. Appointment History
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

            // 4. Clinical Remarks
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

            // Calculate Health Summary
            const summary = {
                visits: mergedTimeline.filter(t => t.type === 'VISIT').length,
                meds: mergedTimeline.filter(t => t.type === 'MEDICATION').length,
                labs: mergedTimeline.filter(t => t.type === 'LAB TEST').length,
                alerts: mergedTimeline.filter(t => t.type === 'ALERT').length,
            };

            // Enrich patient identity with mock data for premium UI look
            const enrichedIdentity = dossierData?.identity || {};
            const finalDossier = {
                identity: {
                    ...enrichedIdentity,
                    age: enrichedIdentity.age || 38,
                    gender: enrichedIdentity.gender || "Female",
                    blood_group: enrichedIdentity.blood_group || "B+",
                    last_visit: mergedTimeline[0]?.appointment_date || "Mar 7, 2026",
                    vitals: enrichedIdentity.vitals || { bp: "115/75", hr: "72", temp: "98.4" },
                    alerts: { allergies: "Penicillin", chronic: "Diabetes" },
                    primary_doctor: "Dr. Naina"
                },
                summary,
                timeline: mergedTimeline
            };

            if (dossierData) {
                setDossier(finalDossier);
            } else {
                const roster = await getPatients().catch(() => []);
                const match = (roster || []).find(p => String(p.id) === String(patientId));
                if (match) {
                    setDossier({
                        identity: {
                            id: match.id,
                            full_name: match.full_name,
                            profile_image: match.patient_image || null,
                            age: 38,
                            gender: match.gender || "Female",
                            blood_group: "B+",
                            last_visit: mergedTimeline[0]?.appointment_date || "N/A",
                            vitals: { bp: "115/75", hr: "72", temp: "98.4" }
                        },
                        timeline: mergedTimeline
                    });
                } else if (mergedTimeline.length > 0) {
                    setDossier({
                        identity: { id: patientId, full_name: "Patient Archive", age: "Unknown", gender: "N/A", blood_group: "Unknown", vitals: { bp: "--", hr: "--", temp: "--" } },
                        timeline: mergedTimeline
                    });
                } else {
                    setError("History stream unavailable.");
                }
            }
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
            <p className="text-secondary mb-4 fw-medium">We couldn't synchronize with the historical medical stream.</p>
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
            event.symptoms?.toLowerCase().includes(searchLower) ||
            "Dr. Naina".toLowerCase().includes(searchLower);

        return matchesType && matchesStatus && matchesDate && matchesSearch;
    });

    const years = [...new Set(timeline.map(e => new Date(e.appointment_date).getFullYear()))].sort((a, b) => b - a);

    return (
        <div className="premium-dashboard-bg min-vh-100 d-flex flex-column pharma-theme">
            {/* Main Header */}
            <div className="bg-white border-bottom sticky-top shadow-sm-sm" style={{ zIndex: 1020 }}>
                <div className="px-4 px-lg-5 py-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-3">
                            <button onClick={() => navigate(-1)} className="btn btn-light rounded-circle shadow-sm border-0 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}><ChevronLeft size={18} /></button>
                            <div>
                                <h4 className="fw-black mb-0 text-dark">Clinical Records History</h4>
                                <div className="text-muted small fw-bold mt-1">Archive Stream • {identity?.full_name}</div>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <select className="form-select form-select-sm rounded-pill px-3 border-2 fw-bold" style={{ width: 'auto' }}>
                                <option>Jump to Date</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="dropdown">
                                <button className="btn btn-outline-primary rounded-pill px-3 fw-black small border-2 d-flex align-items-center gap-2 dropdown-toggle" data-bs-toggle="dropdown">
                                    <Download size={14} /> Export
                                </button>
                                <ul className="dropdown-menu shadow border-0 rounded-4">
                                    <li><button className="dropdown-item fw-bold py-2"><FlaskConical size={14} className="me-2" /> Export PDF</button></li>
                                    <li><button className="dropdown-item fw-bold py-2"><Layers size={14} className="me-2" /> Export CSV</button></li>
                                    <li><button className="dropdown-item fw-bold py-2"><Activity size={14} className="me-2" /> Full Medical Report</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Patient Summary Card */}
                    <div className="bg-white rounded-4 p-4 border mb-4 shadow-sm-sm">
                        <div className="row g-4 align-items-start">
                            <div className="col-12 col-lg-4 border-end">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <div className="bg-primary bg-opacity-10 text-primary rounded-4 d-flex align-items-center justify-content-center fw-black shadow-sm" style={{ width: '64px', height: '64px', fontSize: '1.6rem' }}>
                                        {identity?.full_name?.charAt(0).toUpperCase() || 'P'}
                                    </div>
                                    <div>
                                        <h4 className="fw-black mb-1 text-dark">{identity?.full_name}</h4>
                                        <div className="badge bg-light text-muted border py-1 px-2 rounded fw-black small">PATIENT ID: NN-{String(identity?.id || '---').padStart(4, '0')}</div>
                                    </div>
                                </div>
                                <div className="d-flex flex-column gap-2 text-muted small fw-bold mt-2">
                                    <span className="d-flex justify-content-between">Age / Sex: <span>{identity?.age} | {identity?.gender}</span></span>
                                    <span className="d-flex justify-content-between">Blood Group: <span className="text-danger">{identity?.blood_group}</span></span>
                                    <span className="d-flex justify-content-between border-top pt-2">Primary Doctor: <span className="text-dark">{identity?.primary_doctor}</span></span>
                                    <span className="d-flex justify-content-between">Last Visit: <span className="text-dark">{new Date(identity?.last_visit).toLocaleDateString()}</span></span>
                                </div>
                            </div>

                            <div className="col-12 col-lg-5 border-end px-lg-4">
                                <div className="d-flex align-items-center gap-2 mb-3 text-danger">
                                    <ShieldAlert size={16} />
                                    <h6 className="fw-black mb-0 text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>Medical Alerts</h6>
                                </div>
                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="bg-danger bg-opacity-5 p-3 rounded-4 h-100 border border-danger border-opacity-10">
                                            <div className="text-danger fw-black mb-1" style={{ fontSize: '0.6rem' }}>ALLERGIES</div>
                                            <div className="small fw-bold text-dark">{identity?.alerts?.allergies}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bg-warning bg-opacity-5 p-3 rounded-4 h-100 border border-warning border-opacity-10">
                                            <div className="text-warning fw-black mb-1" style={{ fontSize: '0.6rem' }}>CHRONIC CONDITIONS</div>
                                            <div className="small fw-bold text-dark">{identity?.alerts?.chronic}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-lg-3 mt-lg-0 mt-3">
                                <div className="small text-muted fw-black mb-3 ls-wide text-uppercase" style={{ fontSize: '0.65rem' }}>Current Vitals</div>
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="small text-muted fw-bold">BP</span>
                                        <span className="fw-black text-primary">{identity?.vitals?.bp}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="small text-muted fw-bold">HEART RATE</span>
                                        <span className="fw-black text-danger">{identity?.vitals?.hr} <small className="small opacity-50">BPM</small></span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="small text-muted fw-bold">TEMP</span>
                                        <span className="fw-black text-warning">{identity?.vitals?.temp}°F</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Activity Summary */}
                    <div className="row g-3 mb-4">
                        {[
                            { label: "Total Visits", val: dossier?.summary?.visits, color: "#3b82f6", icon: <User size={14} /> },
                            { label: "Medications", val: dossier?.summary?.meds, color: "#10b981", icon: <Pill size={14} /> },
                            { label: "Lab Tests", val: dossier?.summary?.labs, color: "#8b5cf6", icon: <FlaskConical size={14} /> },
                            { label: "Total Alerts", val: dossier?.summary?.alerts, color: "#f43f5e", icon: <AlertCircle size={14} /> }
                        ].map(stat => (
                            <div key={stat.label} className="col-6 col-md-3">
                                <div className="bg-white p-3 rounded-4 border shadow-sm-sm d-flex align-items-center gap-3">
                                    <div className="p-2 rounded-3 text-white shadow-sm" style={{ backgroundColor: stat.color }}>{stat.icon}</div>
                                    <div>
                                        <div className="small text-muted fw-black ls-tight opacity-50" style={{ fontSize: '0.6rem' }}>{stat.label.toUpperCase()}</div>
                                        <div className="fw-black h5 mb-0" style={{ color: stat.color }}>{stat.val}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-md-4">
                            <div className="position-relative">
                                <div className="position-absolute start-0 top-50 translate-middle-y ms-3 text-primary opacity-75"><Zap size={16} /></div>
                                <input 
                                    type="text" 
                                    className="form-control rounded-pill ps-5 bg-white border border-primary border-opacity-10 py-2 fw-bold shadow-sm-sm" 
                                    placeholder="Search Diagnosis, Doctor, Symptom..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-12 col-md-8 d-flex flex-wrap gap-2 overflow-auto thin-scrollbar pb-1 align-items-center justify-content-md-end">
                            <select className="form-select form-select-sm rounded-pill px-3 border-0 bg-white shadow-sm fw-bold w-auto" onChange={(e) => setDateFilter(e.target.value)}>
                                <option>All Time</option>
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                                <option>Last Year</option>
                            </select>
                            <select className="form-select form-select-sm rounded-pill px-3 border-0 bg-white shadow-sm fw-bold w-auto" onChange={(e) => setStatusFilter(e.target.value)}>
                                <option>All Status</option>
                                <option>Completed</option>
                                <option>Pending</option>
                                <option>Critical</option>
                            </select>
                            <div className="me-2 text-muted small fw-black ls-wide text-uppercase opacity-50 ms-lg-3"><Filter size={12} /> Filter:</div>
                            {["All", "Visits", "Medications", "Labs", "Alerts"].map(label => (
                                <button 
                                    key={label}
                                    onClick={() => setActiveFilter(label)}
                                    className={`btn rounded-pill px-4 py-1-5 fw-black small text-nowrap transition-all border-0 shadow-sm-sm ${activeFilter === label ? 'btn-primary text-white shadow-primary' : 'btn-white text-muted hover-lift'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto bg-light bg-opacity-50 thin-scrollbar relative">
                <div className="container py-4 px-lg-5">
                    <div className="mx-auto" style={{ maxWidth: '1000px' }}>
                        {filteredTimeline.length > 0 ? (
                            <div className="position-relative ms-md-5 ps-md-5">
                                <div className="position-absolute start-0 top-0 bottom-0 border-start border-3 opacity-10 d-none d-md-block" style={{ borderColor: '#2b70ff', left: '1px' }}></div>

                                {filteredTimeline.map((event, index) => {
                                    const eventDate = new Date(event.appointment_date);
                                    const isExpanded = expandedCards.has(event.id);
                                    const isActive = activeCard === event.id;
                                    const dateStr = eventDate.toLocaleDateString();
                                    const isCollapsed = collapsedDates.has(dateStr);
                                    const showDateHeader = index === 0 || 
                                        new Date(filteredTimeline[index-1].appointment_date).toLocaleDateString() !== dateStr;

                                    return (
                                        <div key={event.id} className={`mb-4 position-relative group-date-container ${isActive ? 'active-event' : ''}`} onClick={() => setActiveCard(event.id)}>
                                            {showDateHeader && (
                                                <div className="date-group-header mb-4 d-flex align-items-center gap-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleDateCollapse(dateStr); }}>
                                                    <div className="bg-white border text-dark py-2 px-4 rounded-pill fw-black shadow-sm-sm small ls-wide text-uppercase d-flex align-items-center gap-2 hover-lift">
                                                        <Calendar size={14} className="text-primary" />
                                                        {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        <ChevronDown size={14} className={`transition-all ${isCollapsed ? 'rotate-n90' : ''}`} />
                                                    </div>
                                                    <div className="flex-grow-1 border-top opacity-10"></div>
                                                </div>
                                            )}

                                            {!isCollapsed && (
                                                <div className="d-flex flex-column flex-md-row gap-4 align-items-md-start animate-fade-in">
                                                    {/* Time Marker */}
                                                    <div className="time-marker-container d-none d-md-block position-absolute start-0 translate-middle-x pe-4 text-end" style={{ width: '100px', left: '-50px', marginTop: '10px' }}>
                                                        <div className="text-muted fw-black small opacity-50 ls-tight">{eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                    </div>

                                                    {/* Card Wrapper */}
                                                    <div className={`flex-grow-1 bg-white rounded-5 shadow-sm overflow-hidden transition-all hover-glow border-2 position-relative ${isActive ? 'border-primary border-opacity-50 shadow-lg' : 'border-transparent border'}`}>
                                                        {/* Priority Indicator */}
                                                        <div className="position-absolute start-0 top-0 bottom-0" style={{ width: '6px', backgroundColor: event.color }}></div>
                                                        
                                                        <div className="p-3-5 ps-4">
                                                            <div className="d-flex flex-wrap justify-content-between align-items-start mb-3 gap-2">
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm" style={{ backgroundColor: event.color, width: '38px', height: '38px' }}>
                                                                        {event.icon}
                                                                    </div>
                                                                    <div>
                                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                                            <span className="small fw-black text-uppercase ls-wide opacity-50 font-medical" style={{ fontSize: '0.6rem' }}>{event.type}</span>
                                                                            <span className="badge rounded-pill fw-black small border-0" style={{ fontSize: '0.62rem', backgroundColor: '#f1f5f9', color: '#64748b' }}>REPORT ID: NN-{String(event.id).substring(0,8)}</span>
                                                                        </div>
                                                                        <h6 className="fw-black mb-0 text-dark d-flex align-items-center gap-2">
                                                                            {event.reason}
                                                                            <span className="badge rounded-pill fw-black px-2 pb-1" style={{ fontSize: '0.55rem', backgroundColor: event.statusColor, color: event.statusTextColor, height: 'fit-content', border: `1px solid ${event.color}30` }}>
                                                                                {event.status}
                                                                            </span>
                                                                        </h6>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2">
                                                                    <button title="View Full Report" className="btn btn-light-soft btn-sm rounded-pill px-3 py-1-5 border-0 small fw-black d-flex align-items-center gap-1 hover-lift">
                                                                        <Activity size={12} /> View
                                                                    </button>
                                                                    <button title="Download PDF" className="btn btn-light-soft btn-sm rounded-pill px-3 py-1-5 border-0 small fw-black d-flex align-items-center gap-1 hover-lift">
                                                                        <Download size={12} /> Download
                                                                    </button>
                                                                    <button title="Print Record" className="btn btn-light-soft btn-sm rounded-circle p-2 border-0 d-flex align-items-center justify-content-center hover-lift"><Clock size={12} /></button>
                                                                </div>
                                                            </div>

                                                            <div className="row g-2 mb-3">
                                                                <div className="col-12 col-md-4">
                                                                    <div className="card-info-box h-100">
                                                                        <div className="info-box-label">🩺 DIAGNOSIS</div>
                                                                        <div className="info-box-value text-truncate">{event.diagnosis || event.reason}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-12 col-md-4">
                                                                    <div className="card-info-box h-100">
                                                                        <div className="info-box-label">💬 SYMPTOMS</div>
                                                                        <div className="info-box-value text-truncate">{event.symptoms || "Regular checkup"}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-12 col-md-4">
                                                                    <div className="card-info-box h-100">
                                                                        <div className="info-box-label">👨‍⚕️ ATTENDING DOCTOR</div>
                                                                        <div className="info-box-value d-flex align-items-center gap-2">
                                                                            <div className="bg-primary bg-opacity-10 text-primary rounded-circle small p-1 d-flex" style={{ width: '18px', height: '18px' }}><User size={10} /></div>
                                                                            Dr. Naina
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="d-flex align-items-center justify-content-between pt-2">
                                                                <div className="d-flex align-items-center gap-2 opacity-50 small fw-bold">
                                                                    <Clock size={12} />
                                                                    {new Date(event.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(event.id); }}
                                                                    className={`btn btn-link btn-sm fw-black text-decoration-none transition-all p-0 ${isExpanded ? 'text-primary' : 'text-muted'}`}
                                                                >
                                                                    {isExpanded ? "Hide Details ▲" : "Expand Details ▼"}
                                                                </button>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="mt-3 pt-3 border-top border-dashed animate-slide-down">
                                                                    <div className="row g-3">
                                                                        <div className="col-12 col-lg-8">
                                                                            <div className="mb-3">
                                                                                <div className="fw-black mini-label mb-2">CLINICAL OBSERVATIONS & NOTES</div>
                                                                                <div className="p-3 bg-light rounded-4 small fw-bold text-secondary lh-lg border-start border-4 border-primary shadow-sm-sm">
                                                                                    {event.notes}
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-3 bg-light rounded-4 mb-3">
                                                                                <div className="fw-black mini-label mb-1">AUDIT LOG</div>
                                                                                <div className="small fw-bold text-muted d-flex align-items-center gap-2">
                                                                                    <div className="bg-white border rounded-circle p-1"><User size={10} /></div>
                                                                                    Last edited by {identity?.primary_doctor} on {new Date(event.appointment_date).toLocaleDateString()}
                                                                                </div>
                                                                            </div>
                                                                            {event.type === 'MEDICATION' && (
                                                                                <div>
                                                                                    <div className="fw-black mini-label mb-2">PRESCRIPTION ITEMS</div>
                                                                                    <div className="d-flex flex-wrap gap-2">
                                                                                        <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-2 px-3 fw-black small shadow-sm-sm">Paracetamol 500mg</span>
                                                                                        <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-2 px-3 fw-black small shadow-sm-sm">Cetirizine 10mg — OD</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="col-12 col-lg-4">
                                                                            <div className="fw-black mini-label mb-2">ATTACHMENTS</div>
                                                                            <div className="d-flex flex-column gap-2">
                                                                                <div className="attachment-item bg-white border rounded-3 p-2 d-flex align-items-center gap-2 shadow-sm-sm">
                                                                                    <FlaskConical size={14} className="text-primary opacity-50" />
                                                                                    <span className="small fw-bold text-truncate flex-grow-1">MRI_SCAN_#{event.id}.dcm</span>
                                                                                    <Download size={14} className="text-muted" />
                                                                                </div>
                                                                                <div className="attachment-item bg-white border rounded-3 p-2 d-flex align-items-center gap-2 shadow-sm-sm">
                                                                                    <Layers size={14} className="text-primary opacity-50" />
                                                                                    <span className="small fw-bold text-truncate flex-grow-1">LabReport_#{String(event.id).substring(0,4)}.pdf</span>
                                                                                    <Download size={14} className="text-muted" />
                                                                                </div>
                                                                                <div className="attachment-item bg-white border rounded-3 p-2 d-flex align-items-center gap-2 shadow-sm-sm">
                                                                                    <Pill size={14} className="text-primary opacity-50" />
                                                                                    <span className="small fw-bold text-truncate flex-grow-1">Digital_Prescription.pdf</span>
                                                                                    <Download size={14} className="text-muted" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-3">
                                                                                <button className="btn btn-outline-dark btn-sm w-100 rounded-pill fw-black small border-2 hover-lift">View Full Dossier</button>
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
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-5 bg-white rounded-5 shadow-sm border p-5 animate-fade-in">
                                <Activity size={64} className="text-primary opacity-10 mb-4" />
                                <h4 className="fw-black text-dark mb-2">No Clinical Streams Found</h4>
                                <p className="text-secondary fw-bold mx-auto mb-4" style={{ maxWidth: '400px' }}>Start building the patient's medical history by adding the first clinical encounter or diagnostic record to the timeline.</p>
                                <button className="btn btn-primary rounded-pill px-5 py-2 fw-black shadow border-0 d-flex align-items-center gap-2 mx-auto">
                                    <Plus size={18} /> Add First Medical Record
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Quick Action Button */}
            <button className="btn btn-primary rounded-circle shadow-lg position-fixed d-flex align-items-center justify-content-center floating-add-btn" 
                style={{ bottom: '30px', right: '30px', width: '60px', height: '60px', zIndex: 1050 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Jump to Latest Record"
            >
                <ChevronRight size={30} strokeWidth={3} className="rotate-n90" />
            </button>

            <style>{`
                .pharma-theme { --primary-h: 221; --primary-s: 83%; --primary-l: 53%; }
                .premium-dashboard-bg { background: #f0f4f8; }
                .fw-black { font-weight: 850; }
                .ls-wide { letter-spacing: 0.8px; }
                .ls-tight { letter-spacing: -0.2px; }
                .shadow-sm-sm { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
                .p-3-5 { padding: 1.25rem; }
                .shadow-primary { box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); }
                .btn-white { background: white; border: 1px solid rgba(0,0,0,0.05); }
                .btn-light-soft { background: #f8fafc; color: #475569; }
                .btn-light-soft:hover { background: #eff6ff; color: #2563eb; }
                
                .hover-glow:hover { box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.08), 0 15px 15px -5px rgba(0, 0, 0, 0.05) !important; transform: translateY(-5px); }
                .hover-lift { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                .hover-lift:hover { transform: translateY(-2px); }
                
                .card-info-box { background: #fcfdfe; border: 1px solid #edf2f7; padding: 14px; border-radius: 12px; }
                .info-box-label { font-size: 0.52rem; font-weight: 850; color: #94a3b8; letter-spacing: 1.2px; margin-bottom: 6px; text-transform: uppercase; }
                .info-box-value { font-size: 0.82rem; font-weight: 750; color: #334155; }
                
                .mini-label { font-size: 0.58rem; color: #94a3b8; letter-spacing: 1.4px; margin-bottom: 10px; font-weight: 850; }
                .border-dashed { border-top-style: dashed !important; border-top-width: 2px !important; border-top-color: #e2e8f0 !important; }
                
                .animate-slide-down { animation: slideDown 0.4s cubic-bezier(0.2, 0, 0, 1); }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
                
                .pulsating-loader { width: 44px; height: 44px; background: #2563eb; border-radius: 50%; position: relative; animation: pulse 1.5s infinite; }
                @keyframes pulse { 
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6); }
                    70% { transform: scale(1); box-shadow: 0 0 0 18px rgba(37, 99, 235, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
                }

                .floating-add-btn { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border: 0 !important; }
                .floating-add-btn:hover { transform: scale(1.15); box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4) !important; }
                
                .rotate-n90 { transform: rotate(-90deg); }
                .font-medical { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
                .thin-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .thin-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .thin-scrollbar:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }
                
                .attachment-item { transition: all 0.25s ease; cursor: pointer; border: 1px solid #f1f5f9; }
                .attachment-item:hover { border-color: #2563eb !important; background: #f8fafc !important; transform: translateX(5px); }
                
                .group-date-header { position: sticky; top: 120px; z-index: 50; }
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.3s ease; }
            `}</style>
        </div>
    );
};

export default PatientTimelinePage;
