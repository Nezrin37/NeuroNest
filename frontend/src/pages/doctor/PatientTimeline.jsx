import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, getPatients, getPatientRecords, getClinicalRemarks
} from "../../api/doctor";
import { 
    Calendar, User, Mail, Phone, Clock, Bookmark, 
    ShieldAlert, ChevronLeft, Check, X, AlertCircle, 
    Activity, Heart, Thermometer, Wind, Pill, 
    FlaskConical, AlertTriangle, Fingerprint, Layers,
    ChevronDown, Plus, Download, Filter
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
            
            // Parallel fetch for speed
            const [dossierData, recordsData, remarksData] = await Promise.all([
                getPatientDossier(patientId).catch(() => null),
                getPatientRecords(patientId).catch(() => []),
                getClinicalRemarks(patientId).catch(() => [])
            ]);

            if (dossierData) {
                // Merge records and remarks into timeline if they are not already there
                const existingTimelineIds = new Set((dossierData.timeline || []).map(t => t.id));
                const mergedTimeline = [...(dossierData.timeline || [])];

                // Add records that aren't in the timeline
                (recordsData || []).forEach(record => {
                    if (!existingTimelineIds.has(record.id)) {
                        mergedTimeline.push({
                            id: record.id,
                            appointment_date: record.appointment_date || record.created_at,
                            reason: record.reason || record.diagnosis || "Medical Record",
                            status: record.status || "Completed",
                            notes: record.notes || record.clinical_notes || record.treatment_plan,
                            isLegacyRecord: true
                        });
                        existingTimelineIds.add(record.id);
                    }
                });

                // Sort timeline by date descending
                mergedTimeline.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

                setDossier({
                    ...dossierData,
                    timeline: mergedTimeline
                });
            } else {
                // Fallback to roster if dossier fails
                const roster = await getPatients();
                const match = (roster || []).find(p => String(p.id) === String(patientId));
                if (match) {
                    // Try to construct a timeline from records and remarks even without dossier
                    const combinedTimeline = (recordsData || []).map(r => ({
                        id: r.id,
                        appointment_date: r.appointment_date || r.created_at,
                        reason: r.reason || r.diagnosis || "Medical Record",
                        status: r.status || "Completed",
                        notes: r.notes || r.clinical_notes || r.treatment_plan
                    }));

                    (remarksData || []).forEach(rem => {
                        combinedTimeline.push({
                            id: `rem-${rem.id}`,
                            appointment_date: rem.created_at,
                            reason: "Clinical Remark",
                            status: "Recorded",
                            notes: rem.content
                        });
                    });

                    combinedTimeline.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

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
                        timeline: combinedTimeline
                    });
                } else {
                    setError("Dossier localized error. Path integrity failure.");
                }
            }
            setError(null);
        } catch (err) {
            console.error("Error fetching patient records for timeline:", err);
            setError("Critical failure in medical record retrieval.");
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
        <div className="premium-dashboard-bg py-4 px-4 px-lg-5">
            {/* Simple Clean Header */}
            <div className="d-flex align-items-center gap-3 mb-5 pt-2">
                <button onClick={() => navigate(-1)} className="btn btn-white shadow-sm rounded-circle p-2 border-0">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h4 className="fw-black mb-0">Clinical Timeline</h4>
                    <div className="small fw-bold text-muted opacity-75">Historical Visit Log • {identity.full_name}</div>
                </div>
            </div>

            {/* Content Tabs & Actions */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h5 className="fw-black mb-0">Medical Timeline History</h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-light rounded-pill px-3 py-1 fw-bold small border d-flex align-items-center gap-2">
                        <Filter size={14} /> Filter
                    </button>
                    <div className="btn-group rounded-pill border overflow-hidden shadow-sm">
                        <button className="btn btn-white btn-sm px-3 fw-bold active">Timeline</button>
                        <button className="btn btn-white btn-sm px-3 fw-bold">List</button>
                        <button className="btn btn-white btn-sm px-3 fw-bold">Grid</button>
                    </div>
                </div>
            </div>

            {/* Visit Timeline Grid */}
            <div className="row g-4">
                {timeline && timeline.length > 0 ? (
                    timeline.map((event) => (
                        <div key={event.id} className="col-12 col-xl-6">
                            <div className="card-premium p-4 h-100 bg-white border border-opacity-10 position-relative overflow-visible shadow-sm rounded-4">
                                <div className="d-flex justify-content-between align-items-start mb-4">
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <div className="bg-light p-2 rounded-circle border">
                                                <Calendar size={16} className="text-primary" />
                                            </div>
                                            <span className="small fw-black text-muted text-uppercase" style={{ letterSpacing: '1px' }}>
                                                {new Date(event.appointment_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h5 className="fw-black mb-0">{event.reason || "Routine Clinical Assessment"}</h5>
                                    </div>
                                    <div className={`badge rounded-pill px-3 py-2 fw-black text-uppercase shadow-sm border
                                        ${event.status === 'Completed' ? 'bg-success bg-opacity-10 text-success border-success' : 
                                          event.status === 'Pending' ? 'bg-warning bg-opacity-10 text-warning border-warning' : 
                                          'bg-primary bg-opacity-10 text-primary border-primary'}`} 
                                        style={{ fontSize: '0.65rem' }}>
                                        {event.status}
                                    </div>
                                </div>

                                <div className="p-3 bg-light rounded-4 border mb-4 fw-medium text-secondary small" style={{ minHeight: '80px' }}>
                                    <div className="d-flex gap-2 mb-2 opacity-50">
                                        <AlertCircle size={14} />
                                        <span className="fw-black text-uppercase" style={{ fontSize: '0.6rem' }}>Clinical Observations</span>
                                    </div>
                                    {event.notes || "No additional clinical notes recorded for this encounter."}
                                </div>

                                <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="avatar-stack d-flex">
                                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small border border-white" style={{ width: '32px', height: '32px' }}>D</div>
                                        </div>
                                        <div className="small fw-bold text-muted">Clinical Record</div>
                                    </div>
                                    <button className="btn btn-link text-dark p-0 small fw-bold text-decoration-none d-flex align-items-center gap-1">
                                        View Details <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-12 text-center py-5">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                            <Calendar size={40} className="text-muted opacity-50" />
                        </div>
                        <h4 className="fw-black text-muted">No Visits Recorded</h4>
                        <p className="text-secondary fw-bold small">There is no documented clinical history for this patient yet.</p>
                    </div>
                )}
            </div>

            <style>{`
                .fw-black { font-weight: 950; }
                .ms-n2 { margin-left: -0.5rem; }
                .last-mb-0:last-child { margin-bottom: 0 !important; }
            `}</style>
        </div>
    );
};

export default PatientTimelinePage;
