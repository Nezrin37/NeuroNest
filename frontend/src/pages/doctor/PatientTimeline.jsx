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

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            
            // Parallel fetch for speed across all potential history sources
            const [dossierData, recordsRes, remarksRes, historyRes] = await Promise.all([
                getPatientDossier(patientId).catch(() => null),
                getPatientRecords(patientId).catch(() => []),
                getClinicalRemarks(patientId).catch(() => []),
                getAppointmentHistory().catch(() => [])
            ]);

            // De-nest responses if they are objects
            const recordsData = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.records || []);
            const remarksData = Array.isArray(remarksRes) ? remarksRes : (remarksRes?.remarks || []);
            const allHistory = Array.isArray(historyRes) ? historyRes : (historyRes?.appointments || []);

            // Filter history for this specific patient
            const patientHistory = allHistory.filter(apt => String(apt.patient_id) === String(patientId));

            const existingTimelineIds = new Set();
            const mergedTimeline = [];

            // 1. Start with Dossier Timeline
            if (dossierData?.timeline) {
                (dossierData.timeline || []).forEach(t => {
                    if (t.id) {
                        mergedTimeline.push(t);
                        existingTimelineIds.add(String(t.id));
                    }
                });
            }

            // 2. Add Patient Records (Legacy/Direct)
            recordsData.forEach(record => {
                const rid = String(record.id);
                if (!existingTimelineIds.has(rid)) {
                    mergedTimeline.push({
                        id: record.id,
                        appointment_date: record.appointment_date || record.created_at || record.date,
                        reason: record.reason || record.diagnosis || "Clinical Record",
                        status: record.status || "Completed",
                        notes: record.notes || record.clinical_notes || record.treatment_plan || record.summary,
                        isLegacyRecord: true
                    });
                    existingTimelineIds.add(rid);
                }
            });

            // 3. Add Filtered Appointment History
            patientHistory.forEach(apt => {
                const aid = String(apt.id);
                if (!existingTimelineIds.has(aid)) {
                    mergedTimeline.push({
                        id: apt.id,
                        appointment_date: apt.appointment_date || apt.date,
                        reason: apt.reason || "Appointment History",
                        status: apt.status || "Matched",
                        notes: apt.notes || apt.clinical_notes || "Previous visit record."
                    });
                    existingTimelineIds.add(aid);
                }
            });

            // 4. Add Clinical Remarks
            remarksData.forEach(rem => {
                const remId = `rem-${rem.id}`;
                if (!existingTimelineIds.has(remId)) {
                    mergedTimeline.push({
                        id: remId,
                        appointment_date: rem.created_at || rem.date,
                        reason: "Clinical Remark",
                        status: "Pinned",
                        notes: rem.content || rem.remark
                    });
                    existingTimelineIds.add(remId);
                }
            });

            // Re-sort items by date (Newest First)
            mergedTimeline.sort((a, b) => {
                const dateA = new Date(a.appointment_date || a.date);
                const dateB = new Date(b.appointment_date || b.date);
                return dateB - dateA;
            });

            if (dossierData) {
                setDossier({
                    ...dossierData,
                    timeline: mergedTimeline
                });
            } else {
                // Roster Fallback with constructed timeline
                const roster = await getPatients().catch(() => []);
                const match = (roster || []).find(p => String(p.id) === String(patientId));
                
                if (match) {
                    setDossier({
                        identity: {
                            id: match.id,
                            full_name: match.full_name,
                            email: match.email || "N/A",
                            phone: match.phone || "N/A",
                            profile_image: match.patient_image || null,
                            gender: match.gender || "Not Specified",
                            dob: match.dob || "N/A"
                        },
                        timeline: mergedTimeline
                    });
                } else {
                    // Even if not in roster, if we have timeline data, show it
                    if (mergedTimeline.length > 0) {
                        setDossier({
                            identity: { id: patientId, full_name: "Patient Archive" },
                            timeline: mergedTimeline
                        });
                    } else {
                        setError("Patient localized error. Path integrity failure.");
                    }
                }
            }
            setError(null);
        } catch (err) {
            console.error("Critical failure in medical record retrieval:", err);
            setError("Network localized failure. Historical stream interrupted.");
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        if (patientId) {
            fetchDossier();
        } else {
            setLoading(false);
        }
    }, [patientId, fetchDossier]);

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 gap-3 premium-dashboard-bg">
            <div className="spinner-grow text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary fw-black text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Accessing Secure Dossier...</p>
        </div>
    );
    
    if (error || !dossier) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4 premium-dashboard-bg">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                <ShieldAlert size={40} />
            </div>
            <h2 className="fs-3 fw-black text-dark mb-2">Access Denied</h2>
            <button onClick={() => navigate(-1)} className="btn btn-dark rounded-pill px-5 py-2 fw-bold shadow-sm mt-3">Return to Safety</button>
        </div>
    );

    const { identity, timeline } = dossier;

    return (
        <div className="premium-dashboard-bg min-vh-100 d-flex flex-column">
            {/* Optimized Header Card */}
            <div className="bg-white border-bottom sticky-top shadow-sm" style={{ zIndex: 1020 }}>
                <div className="px-4 px-lg-5 py-4">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-4">
                            <button onClick={() => navigate(-1)} className="btn btn-light shadow-sm rounded-circle p-2 border-0 hover-lift">
                                <ChevronLeft size={20} className="text-dark" />
                            </button>
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-black" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                                    {identity?.full_name?.charAt(0).toUpperCase() || 'P'}
                                </div>
                                <div>
                                    <h4 className="fw-black mb-0 text-dark">{identity?.full_name || 'Patient Dossier'}</h4>
                                    <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
                                        <Fingerprint size={12} className="opacity-50" />
                                        <span>ID: #NN-{String(identity?.id || '---').padStart(4, '0')}</span>
                                        <span className="mx-1 opacity-25">•</span>
                                        <Calendar size={12} className="opacity-50" />
                                        <span>Clinical Timeline History</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-none d-md-flex align-items-center gap-2">
                            <button className="btn btn-outline-dark btn-sm rounded-pill px-4 py-2 fw-black border-2 d-flex align-items-center gap-2">
                                <Download size={14} /> Report
                            </button>
                            <button className="btn btn-primary btn-sm rounded-pill px-4 py-2 fw-black shadow-sm d-flex align-items-center gap-2">
                                <Plus size={14} /> New Entry
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto thin-scrollbar bg-light bg-opacity-50">
                <div className="container py-5">
                    <div className="mx-auto" style={{ maxWidth: '850px' }}>
                        
                        {timeline && timeline.length > 0 ? (
                            <div className="position-relative ms-md-5 ps-md-4">
                                {/* Vertical Timeline Stem */}
                                <div className="position-absolute start-0 top-0 bottom-0 border-start border-3 opacity-10 d-none d-md-block" style={{ borderColor: '#2b70ff', marginLeft: '-2px' }}></div>

                                {timeline.map((event, index) => {
                                    const eventDate = new Date(event.appointment_date || event.date);
                                    const showDateHeader = index === 0 || 
                                        new Date(timeline[index-1].appointment_date || timeline[index-1].date).toLocaleDateString() !== eventDate.toLocaleDateString();

                                    return (
                                        <div key={event.id} className="mb-5 position-relative">
                                            {showDateHeader && (
                                                <div className="d-md-absolute start-0 translate-middle-x ms-md-n4 mb-3 d-flex align-items-center gap-2" style={{ top: '-15px', zIndex: 10 }}>
                                                    <div className="badge bg-white text-primary border-2 border-primary border-opacity-10 py-2 px-3 rounded-pill fw-black shadow-sm" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                        {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="d-flex flex-column flex-md-row align-items-md-start gap-4">
                                                {/* Time Label on left */}
                                                <div className="d-none d-md-block position-absolute start-0 translate-middle-x ms-md-n5 pe-4 text-end" style={{ width: '120px', left: '-60px' }}>
                                                    <div className="text-muted fw-black small opacity-50 text-uppercase d-flex align-items-center justify-content-end gap-1">
                                                        <Clock size={12} />
                                                        {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </div>

                                                {/* Timeline Dot */}
                                                <div className="d-none d-md-block position-absolute start-0 translate-middle-x border-0 bg-transparent" style={{ zIndex: 2, left: '0' }}>
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm border-2 border-white
                                                        ${event.status === 'Completed' ? 'bg-success text-white' : 
                                                          event.status === 'Recorded' ? 'bg-primary text-white' : 
                                                          'bg-white text-muted border border-opacity-50'}`} 
                                                        style={{ width: '24px', height: '24px' }}>
                                                        {event.status === 'Completed' || event.status === 'Recorded' ? <Check size={12} strokeWidth={4} /> : <div className="bg-muted rounded-circle" style={{width: '6px', height: '6px'}}></div>}
                                                    </div>
                                                </div>

                                                {/* content Card */}
                                                <div className="flex-grow-1 bg-white border-0 rounded-4 p-4 shadow-sm hover-reveal transition-all position-relative overflow-hidden">
                                                    {/* Status Strip */}
                                                    <div className={`position-absolute top-0 start-0 bottom-0`} style={{ width: '4px', backgroundColor: 
                                                        event.status === 'Completed' ? '#10b981' : 
                                                        event.status === 'Recorded' ? '#2563eb' : 
                                                        '#94a3b8' 
                                                    }}></div>

                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                <span className={`badge rounded-pill px-2 py-1 text-uppercase fw-black`} style={{ 
                                                                    fontSize: '0.6rem', 
                                                                    backgroundColor: event.status === 'Completed' ? '#dcfce7' : '#dbeafe',
                                                                    color: event.status === 'Completed' ? '#166534' : '#1e40af'
                                                                }}>
                                                                    {event.status || 'Archived'}
                                                                </span>
                                                                {event.isLegacyRecord && <span className="badge bg-light text-muted small border-0 fw-black px-2 py-1 rounded-pill" style={{fontSize: '0.6rem'}}>HISTORICAL</span>}
                                                            </div>
                                                            <h5 className="fw-black text-dark mb-1">{event.reason || "General Consultation"}</h5>
                                                        </div>
                                                        <div className="bg-light p-2 rounded-3 d-md-none text-muted small fw-bold">
                                                            {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>

                                                    <div className="text-secondary fw-medium lh-base mb-4 bg-light bg-opacity-50 p-3 rounded-3" style={{ fontSize: '0.9rem', minHeight: '60px' }}>
                                                        {event.notes || "No patient-specific observations were documented for this encounter."}
                                                    </div>
                                                    
                                                    <div className="d-flex align-items-center justify-content-between mt-2 pt-3 border-top border-light">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle">
                                                                <User size={14} />
                                                            </div>
                                                            <span className="small text-muted fw-bold">Recorded by Dr. Naina</span>
                                                        </div>
                                                        <button className="btn btn-link text-primary p-0 small fw-black text-decoration-none d-flex align-items-center gap-1 hover-underline">
                                                            Full Report <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-5 bg-white rounded-5 shadow-sm border p-5">
                                <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '100px', height: '100px' }}>
                                    <Layers size={48} className="text-primary opacity-50" />
                                </div>
                                <h3 className="fw-black text-dark mb-2">Empty Medical Stream</h3>
                                <p className="text-secondary fw-bold mx-auto" style={{maxWidth: '350px'}}>There are currently no chronological medical events or historical dossiers linked to this profile.</p>
                                <button onClick={() => navigate(-1)} className="btn btn-dark rounded-pill px-4 py-2 fw-black mt-3">Go Back</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .premium-dashboard-bg { background: #f1f5f9; }
                .hover-reveal { border: 1px solid transparent !important; }
                .hover-reveal:hover { transform: translateY(-4px); border-color: rgba(37, 99, 235, 0.1) !important; box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important; }
                .hover-lift { transition: transform 0.2s; }
                .hover-lift:hover { transform: scale(1.05); }
                .thin-scrollbar::-webkit-scrollbar { width: 6px; }
                .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .thin-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .fw-black { font-weight: 850; }
                .hover-underline:hover { text-decoration: underline !important; }
            `}</style>
        </div>
    );
};

export default PatientTimelinePage;
