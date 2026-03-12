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
    ChevronDown, Plus, Download, Filter, ChevronRight
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
            {/* Top Navigation Bar - Reference Style */}
            <div className="bg-white border-bottom sticky-top shadow-sm" style={{ zIndex: 1020 }}>
                <div className="px-4 px-lg-5 pt-4 pb-0">
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <button onClick={() => navigate(-1)} className="btn btn-white shadow-sm rounded-circle p-2 border-0">
                            <ChevronLeft size={18} />
                        </button>
                        <div>
                            <h4 className="fw-black mb-0 text-dark">Clinical Records # {identity?.id || '---'}</h4>
                        </div>
                    </div>
                    
                    <div className="d-flex gap-4 overflow-auto pb-0" style={{ scrollbarWidth: 'none' }}>
                        {['TIMELINE', 'VISITS', 'MEDICATIONS', 'LABS', 'ALERTS', 'DOCUMENTS'].map((tab, i) => (
                            <div key={tab} className={`pb-3 fw-black small cursor-pointer position-relative ${i === 0 ? 'text-primary' : 'text-muted opacity-50 text-uppercase'}`} style={{ letterSpacing: '1px', fontSize: '0.7rem', borderBottom: i === 0 ? '3px solid #2b70ff' : '3px solid transparent' }}>
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-grow-1 overflow-hidden">
                <div className="container-fluid h-100 p-0">
                    <div className="row g-0 h-100">
                        {/* Main Scrollable Timeline */}
                        <div className="col-12 col-xl-9 border-end bg-light bg-opacity-50 overflow-auto thin-scrollbar" style={{ height: 'calc(100vh - 145px)' }}>
                            <div className="p-4 p-lg-5 mx-auto" style={{ maxWidth: '800px' }}>
                                
                                {timeline && timeline.length > 0 ? (
                                    <div className="position-relative ms-5 ps-4">
                                        {/* Vertical Timeline Stem */}
                                        <div className="position-absolute start-0 top-0 bottom-0 border-start border-2 opacity-10" style={{ borderColor: '#2b70ff' }}></div>

                                        {timeline.map((event, index) => {
                                            const eventDate = new Date(event.appointment_date || event.date);
                                            const showDateHeader = index === 0 || 
                                                new Date(timeline[index-1].appointment_date || timeline[index-1].date).toLocaleDateString() !== eventDate.toLocaleDateString();

                                            return (
                                                <div key={event.id} className="mb-4 position-relative">
                                                    {showDateHeader && (
                                                        <div className="position-absolute start-0 translate-middle-x ms-n4 ps-1" style={{ top: '-12px' }}>
                                                            <div className="badge bg-light text-muted border py-2 px-3 rounded-pill fw-bold shadow-sm" style={{ fontSize: '0.7rem' }}>
                                                                {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="d-flex align-items-center gap-4 pt-4">
                                                        {/* Time Label on left */}
                                                        <div className="position-absolute start-0 translate-middle-x ms-n5 pe-4 text-end" style={{ width: '100px' }}>
                                                            <span className="text-muted fw-bold small opacity-75">
                                                                {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </div>

                                                        {/* Timeline Dot/Icon */}
                                                        <div className="position-absolute start-0 translate-middle-x border-0 bg-transparent" style={{ zIndex: 2 }}>
                                                            <div className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm border-2 border-white
                                                                ${event.status === 'Completed' ? 'bg-success text-white' : 
                                                                  event.status === 'Recorded' ? 'bg-primary text-white' : 
                                                                  'bg-white text-muted border'}`} 
                                                                style={{ width: '28px', height: '28px' }}>
                                                                {event.status === 'Completed' || event.status === 'Recorded' ? <Check size={14} strokeWidth={3} /> : <Clock size={12} />}
                                                            </div>
                                                        </div>

                                                        {/* Content Card */}
                                                        <div className="flex-grow-1 bg-white border border-opacity-10 rounded-3 p-3 shadow-sm hover-reveal transition-all">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <h6 className="fw-black text-dark mb-0">{event.reason || "Clinical Encounter"}</h6>
                                                                {event.isLegacyRecord && <span className="badge bg-light text-muted small border-0 fw-bold">LEGACY</span>}
                                                            </div>
                                                            <div className="text-secondary small fw-medium mb-2 opacity-75">{event.notes || "No detailed observations recorded."}</div>
                                                            
                                                            {/* Nested details look like reference sub-items */}
                                                            <div className="bg-light bg-opacity-50 rounded-2 p-2 mt-2 border border-light">
                                                                <div className="d-flex align-items-center gap-2 small fw-bold text-muted">
                                                                    <div className="bg-white p-1 rounded border"><Activity size={12} /></div>
                                                                    Report-ID# NN-{String(event.id).substring(0,6)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                                            <Calendar size={40} className="text-muted opacity-50" />
                                        </div>
                                        <h4 className="fw-black text-muted">No History Streams Data</h4>
                                        <p className="text-secondary fw-bold small">Historical records will appear here as they are processed.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Navigation Sidebar - Reference Style */}
                        <div className="col-xl-3 d-none d-xl-block bg-white p-5 border-start">
                            <div className="sticky-top" style={{ top: '180px' }}>
                                <div className="text-muted fw-bold small text-uppercase mb-4 opacity-50" style={{ letterSpacing: '2px' }}>Navigation</div>
                                <div className="d-flex flex-column gap-1">
                                    {[
                                        'Summary', 'Patient Profile', 'Care Team', 'Vitals History', 'Timeline', 'Audit Log', 'Versions'
                                    ].map((item, i) => (
                                        <div key={item} 
                                            className={`py-2 px-3 rounded-pill cursor-pointer fw-black small border-0 transition-all ${i === 4 ? 'bg-light text-dark' : 'text-muted hover-bg-light opacity-75'}`}
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 pt-5 border-top opacity-50">
                                    <div className="text-muted fw-bold small text-uppercase mb-3" style={{ letterSpacing: '1px' }}>Quick Actions</div>
                                    <button className="btn btn-outline-dark btn-sm rounded-pill px-4 py-2 fw-bold w-100 text-start border-2 d-flex align-items-center justify-content-between mb-2">
                                        Generate Report <Download size={14} />
                                    </button>
                                    <button className="btn btn-primary btn-sm rounded-pill px-4 py-2 fw-bold w-100 text-start shadow-sm d-flex align-items-center justify-content-between">
                                        Sync History <Zap size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .premium-dashboard-bg { background: #f8fafc; }
                .hover-reveal:hover { transform: translateX(4px); border-color: #2b70ff !important; box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }
                .hover-bg-light:hover { background-color: #f1f5f9; color: #000 !important; }
                .thin-scrollbar::-webkit-scrollbar { width: 6px; }
                .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .thin-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default PatientTimelinePage;
