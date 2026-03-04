import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, 
    saveClinicalRemark, 
    completeAppointment,
    cancelAppointment,
    markNoShow
} from "../../api/doctor";
import { 
    Calendar, User, Clock, Mail, Phone, Info, 
    ChevronRight, ChevronLeft, Bookmark, ShieldAlert, Edit3, Folder, StickyNote,
    Check, X, AlertCircle, FileText, Activity, MessageSquare, LayoutGrid, Bell,
    Thermometer, Heart, Scale, Stethoscope, Pill, Utensils, Zap, ExternalLink, Droplet
} from "lucide-react";
import { toAssetUrl } from "../../utils/media";
import "../../styles/patient-records.css";

const PatientRecords = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId");
    const navigate = useNavigate();
    
    const [dossier, setDossier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imageError, setImageError] = useState(false);
    
    // Remarks State
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [remarkContent, setRemarkContent] = useState("");
    const [savingRemark, setSavingRemark] = useState(false);

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            setImageError(false);
            const data = await getPatientDossier(patientId);
            setDossier(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching dossier:", err);
            setError("Access restricted. Clinical relationship required.");
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

    const handleSaveRemark = async () => {
        if (!remarkContent.trim()) return;
        try {
            setSavingRemark(true);
            await saveClinicalRemark(patientId, remarkContent);
            setRemarkContent("");
            setShowRemarkModal(false);
            fetchDossier();
        } catch (err) {
            console.error("Failed to save remark:", err);
            alert("Failed to save clinical remark. Please try again.");
        } finally {
            setSavingRemark(false);
        }
    };

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 gap-3 bg-light">
            <div className="spinner-border text-primary border-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary fw-bold text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Retrieving Clinical Archive...</p>
        </div>
    );

    if (error || !dossier) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4 bg-light">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                <ShieldAlert size={40} />
            </div>
            <h2 className="fs-3 fw-bolder text-dark mb-2">Access Restricted</h2>
            <p className="text-secondary mb-4" style={{ maxWidth: '400px' }}>{error || "Patient not found in your clinical records."}</p>
            <button 
                onClick={() => navigate(-1)}
                className="btn btn-dark rounded-pill px-5 py-2 fw-bold shadow-sm"
            >
                Return to Schedule
            </button>
        </div>
    );

    const { identity, timeline, allergies, conditions, medications } = dossier;

    // Helper to calculate age from DOB
    const getAge = (dobString) => {
        if (!dobString || dobString === "N/A") return "";
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const age = getAge(identity.dob);

    return (
        <div className="patient-dashboard-grid-bg min-vh-100 py-4 px-3 px-md-5">
            <div className="mx-auto" style={{ maxWidth: '1440px' }}>
                
                {/* TOP NAVIGATION / STATUS BAR */}
                <div className="d-flex justify-content-between align-items-center mb-5">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            onClick={() => navigate('/doctor/patients')}
                            className="btn btn-white rounded-circle shadow-sm border border-light d-flex align-items-center justify-content-center bg-white"
                            style={{ width: '40px', height: '40px' }}
                        >
                            <ChevronLeft size={20} className="text-dark" />
                        </button>
                        <h4 className="fw-bolder text-dark mb-0 ms-2" style={{ letterSpacing: '-0.5px' }}>Patient Health Profile</h4>
                    </div>
                    <div>
                        <button onClick={() => setShowRemarkModal(true)} className="btn btn-dark rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: '#1e293b' }}>
                            <Edit3 size={16} /> Edit Profile
                        </button>
                    </div>
                </div>

                {/* MAIN IDENTITY CARD */}
                <div className="card patient-profile-card mb-5 border-0">
                    <div className="row align-items-center g-4">
                        <div className="col-12 col-xl-5 d-flex gap-4 align-items-center">
                            {/* Avatar */}
                            <div className="position-relative flex-shrink-0">
                                <div className="patient-img-large overflow-hidden shadow-sm">
                                    {identity.profile_image && !imageError ? (
                                        <img 
                                            src={toAssetUrl(identity.profile_image)} 
                                            alt={identity.full_name} 
                                            className="w-100 h-100 object-fit-cover"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary">
                                            <User size={64} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Basic Info */}
                            <div>
                                <h1 className="fw-black text-dark mb-3" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>{identity.full_name}</h1>
                                <div className="d-flex flex-wrap gap-4 text-muted small fw-bold">
                                    <span className="d-flex align-items-center gap-2"><User size={16} className="text-secondary"/> {identity.gender || 'Not Specified'}</span>
                                    <span className="d-flex align-items-center gap-2"><Calendar size={16} className="text-secondary"/> {identity.dob} {age !== "" && `(${age} years)`}</span>
                                    <span className="d-flex align-items-center gap-2"><Phone size={16} className="text-secondary"/> {identity.phone}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vitals Stats */}
                        <div className="col-12 col-xl-7">
                            <div className="d-flex flex-wrap flex-md-nowrap gap-3 justify-content-xl-end">
                                <div className="stat-dashed-box flex-grow-1">
                                    <div className="text-muted small fw-black text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Current BMI</div>
                                    <div className="h3 fw-black text-primary mb-0">{identity.bmi || '--'} <span className="small text-muted fw-bold" style={{ fontSize: '0.8rem' }}>points</span></div>
                                </div>
                                <div className="stat-dashed-box flex-grow-1">
                                    <div className="text-muted small fw-black text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Recent Weight</div>
                                    <div className="h3 fw-black text-dark mb-0">{identity.weight_kg || '--'} <span className="small text-muted fw-bold" style={{ fontSize: '0.8rem' }}>kg</span></div>
                                </div>
                                <div className="stat-dashed-box flex-grow-1">
                                    <div className="text-muted small fw-black text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Height</div>
                                    <div className="h3 fw-black text-dark mb-0">{identity.height_cm || '--'} <span className="small text-muted fw-bold" style={{ fontSize: '0.8rem' }}>cm</span></div>
                                </div>
                                <div className="stat-dashed-box flex-grow-1">
                                    <div className="text-muted small fw-black text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Blood Type</div>
                                    <div className="h3 fw-black text-danger mb-0 d-flex align-items-center justify-content-center gap-1">
                                        {identity.blood_group !== "N/A" ? identity.blood_group : '--'}
                                        <Droplet size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3 COLUMN GRID SYSTEM */}
                <div className="row g-4 g-xl-5">
                    
                    {/* COLUMN 1: TIMELINE */}
                    <div className="col-12 col-lg-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Clock size={20} className="text-primary" />
                            <h5 className="fw-black text-dark mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '1rem' }}>Recent Appointments</h5>
                        </div>
                        
                        <div className="pt-2 ps-2">
                            {timeline.slice(0, 5).map((item, i) => (
                                <div key={i} className="position-relative mb-4 pb-2" style={{ paddingLeft: '40px' }}>
                                    {/* Line and Dot */}
                                    <div className="timeline-line-dash"></div>
                                    <div className="timeline-dot position-absolute" style={{ left: '0px', top: '4px' }}></div>
                                    
                                    {/* Content */}
                                    <div className="text-muted small fw-black mb-1" style={{ fontSize: '0.75rem' }}>{item.appointment_date}</div>
                                    <div className="card border-0 shadow-sm rounded-4 bg-white p-3 d-inline-block w-100">
                                        <div className="fw-bolder text-dark mb-1">{item.reason || 'General Checkup'}</div>
                                        <div className="text-muted small d-flex align-items-center gap-1 fw-bold">
                                            Dr. {item.doctor_name || 'Assigned Doctor'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {timeline.length === 0 && (
                                <p className="text-muted small italic">No appointments recorded.</p>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: MEDICAL HISTORY */}
                    <div className="col-12 col-lg-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Activity size={20} className="text-primary" />
                            <h5 className="fw-black text-dark mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '1rem' }}>Medical History</h5>
                        </div>
                        
                        <div className="card shadow-sm border-0 bg-white p-4 rounded-4">
                            <div className="row g-4">
                                <div className="col-6">
                                    <div className="text-muted small fw-black text-uppercase mb-3" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Active Conditions</div>
                                    <div className="d-flex flex-column gap-2">
                                        {conditions.filter(c => c.status === 'active').length > 0 ? (
                                            conditions.filter(c => c.status === 'active').map((c, i) => (
                                                <div key={i} className="d-inline-flex">
                                                    <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-3 fw-bold border-0 text-start text-wrap">
                                                        {c.condition_name}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-muted small fw-medium">None</span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="text-muted small fw-black text-uppercase mb-3" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Known Allergies</div>
                                    <div className="d-flex flex-column gap-2">
                                        {allergies.length > 0 ? (
                                            allergies.map((a, i) => (
                                                <div key={i} className="d-inline-flex">
                                                    <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-3 fw-bold border-0 text-start text-wrap">
                                                        {a.allergy_name}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-muted small fw-medium">None</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Medications Table Inline */}
                        <div className="mt-4">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <Pill size={20} className="text-success" />
                                <h6 className="fw-black text-dark mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Current Medications</h6>
                            </div>
                            <div className="card shadow-sm border-0 bg-white rounded-4 overflow-hidden">
                                {medications.length > 0 ? (
                                    <ul className="list-group list-group-flush">
                                        {medications.filter(m => m.status === 'active').map((med, i) => (
                                            <li key={i} className="list-group-item d-flex justify-content-between align-items-center p-3 border-light">
                                                <div>
                                                    <div className="fw-bold text-dark">{med.drug_name}</div>
                                                    <div className="text-muted small">{med.dosage} - {med.frequency}</div>
                                                </div>
                                                <span className="badge bg-success bg-opacity-10 text-success rounded-pill">Active</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-center text-muted small fw-bold">No active medications</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: ROSTER QUICK LINKS / EMERGENCY */}
                    <div className="col-12 col-lg-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <ShieldAlert size={20} className="text-danger" />
                            <h5 className="fw-black text-dark mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '1rem' }}>Clinical Toolkit</h5>
                        </div>
                        
                        <div className="d-flex flex-column gap-3">
                            {[
                                { title: "Assessment Reports", desc: "View lab results & analyses", icon: <FileText size={20} className="text-warning"/>, route: `/doctor/assessment-reports?patientId=${patientId}` },
                                { title: "Medical Encounters", desc: "Full clinical timeline", icon: <Folder size={20} className="text-primary"/>, route: `/doctor/medical-records?patientId=${patientId}` },
                                { title: "Performance Analytics", desc: "Outcome datastores", icon: <Activity size={20} className="text-indigo" style={{ color: '#6610f2' }}/>, route: `/doctor/performance-analytics?patientId=${patientId}` },
                                { title: "Direct Connect", desc: "Secure messaging", icon: <MessageSquare size={20} className="text-success"/>, route: `/doctor/chat?patientId=${patientId}` }
                            ].map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => navigate(item.route)}
                                    className="btn btn-white w-100 text-start border border-light shadow-sm rounded-4 p-3 d-flex align-items-center gap-3 bg-white"
                                    style={{ transition: 'all 0.2s', ':hover': { transform: 'translateX(4px)', borderColor: '#e2e8f0'} }}
                                >
                                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="fw-bolder text-dark mb-1" style={{ fontSize: '0.95rem' }}>{item.title}</div>
                                        <div className="text-muted small fw-medium" style={{ fontSize: '0.75rem' }}>{item.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Additional contact card styling similar to emergency support */}
                        <div className="mt-4">
                         <div className="card shadow-sm border border-danger border-opacity-25 bg-danger bg-opacity-10 rounded-4">
                            <div className="card-body p-3 d-flex align-items-center gap-3">
                                <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px' }}>
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <div className="fw-bolder text-danger mb-0">{identity.phone}</div>
                                    <div className="text-danger small opacity-75 fw-bold" style={{ fontSize: '0.7rem' }}>Primary Contact</div>
                                </div>
                            </div>
                         </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Clinical Remark Modal */}
            {showRemarkModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1" onClick={() => setShowRemarkModal(false)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-bottom-0 p-4 pb-0 d-flex justify-content-between align-items-start">
                                <div>
                                    <h3 className="h5 fw-bolder text-dark mb-1">Clinical Remarks</h3>
                                    <p className="text-secondary small fw-medium mb-0">Internal observations for {identity.full_name}</p>
                                </div>
                                <button 
                                    onClick={() => setShowRemarkModal(false)}
                                    className="btn-close shadow-none"
                                ></button>
                            </div>
                            
                            <div className="modal-body p-4">
                                <label className="form-label small fw-bolder text-secondary text-uppercase mb-2" style={{ letterSpacing: '1px' }}>Observations & Notes</label>
                                <textarea 
                                    value={remarkContent}
                                    onChange={(e) => setRemarkContent(e.target.value)}
                                    className="form-control border-2 shadow-none rounded-3 p-3 fw-medium mb-3"
                                    placeholder="Enter clinical observations, behavioral notes, or treatment compliance remarks..."
                                    rows="6"
                                    autoFocus
                                ></textarea>
                                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 rounded-3 border-0 bg-info bg-opacity-10 text-info fw-medium mb-0" role="alert">
                                    <Info size={16} className="flex-shrink-0" />
                                    <span>These remarks are internal and not visible to patients.</span>
                                </div>
                            </div>

                            <div className="modal-footer border-top-0 p-4 pt-0 d-flex gap-2">
                                <button 
                                    onClick={() => setShowRemarkModal(false)}
                                    className="btn btn-light rounded-pill px-4 fw-bold shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveRemark}
                                    disabled={savingRemark || !remarkContent.trim()}
                                    className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
                                >
                                    {savingRemark ? "Saving..." : "Save Remark"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientRecords;
