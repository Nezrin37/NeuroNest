import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, getPatients
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
            const data = await getPatientDossier(patientId);
            setDossier(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching dossier for timeline:", err);
            try {
                // Fallback to roster
                const roster = await getPatients();
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
                        timeline: []
                    });
                    setError(null);
                    return;
                }
            } catch (fallbackErr) {
                console.error("Timeline fallback failed", fallbackErr);
            }
            setError("Dossier localized error. Path integrity failure.");
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

            {/* Experimental Premium Timeline View */}
            <div className="row g-4">
                {timeline.map((event) => (
                    <div key={event.id} className="col-12 col-xl-6">
                        <div className="card-premium p-4 h-100 bg-white border border-opacity-10 position-relative overflow-visible">
                            <div className="position-absolute top-50 start-0 translate-middle-x ms-n2 d-none d-xl-block">
                                <div className="bg-primary rounded-circle border border-white border-4" style={{ width: '16px', height: '16px' }}></div>
                            </div>

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
                                    <div className="avatar-stack">
                                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small border border-white" style={{ width: '32px', height: '32px' }}>D</div>
                                        <div className="bg-light text-muted rounded-circle d-flex align-items-center justify-content-center fw-bold small border border-white ms-n2" style={{ width: '32px', height: '32px' }}>+3</div>
                                    </div>
                                    <div className="small fw-bold text-muted">Consulting Team</div>
                                </div>
                                <button className="btn btn-outline-dark rounded-pill px-4 py-2 small fw-bold d-flex align-items-center gap-2 border-2">
                                    Full Report <ChevronDown size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
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
