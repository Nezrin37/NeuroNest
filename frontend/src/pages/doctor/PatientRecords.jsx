import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, 
    saveClinicalRemark,
    getPatients
} from "../../api/doctor";
import { 
    Calendar, User, Clock, Mail, Phone, Info, 
    ChevronRight, ChevronLeft, Bookmark, ShieldAlert, Edit3, Folder, StickyNote,
    Check, X, AlertCircle, FileText, Activity, MessageSquare, LayoutGrid, Bell,
    Thermometer, Heart, Scale, Stethoscope, Pill, Utensils, Zap, ExternalLink, Droplet,
    MapPin, Briefcase, Plus, MoreHorizontal, Moon
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
    const [usingFallbackDossier, setUsingFallbackDossier] = useState(false);
    
    // Remarks State
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [remarkContent, setRemarkContent] = useState("");
    const [savingRemark, setSavingRemark] = useState(false);

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            setImageError(false);
            setUsingFallbackDossier(false);
            const data = await getPatientDossier(patientId);
            setDossier(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching dossier:", err);
            try {
                // Fallback: if patient exists in doctor's roster, allow a minimal dossier view.
                const roster = await getPatients();
                const rosterMatch = (roster || []).find((p) => String(p.id) === String(patientId));

                if (rosterMatch) {
                    setDossier({
                        identity: {
                            id: rosterMatch.id,
                            full_name: rosterMatch.full_name || "Unknown Patient",
                            email: rosterMatch.email || "N/A",
                            phone: "N/A",
                            gender: "Not Specified",
                            dob: "N/A",
                            profile_image: rosterMatch.patient_image || null,
                            blood_group: "N/A",
                            height_cm: null,
                            weight_kg: null,
                            bmi: null,
                            allergies_summary: "None",
                            chronic_conditions_summary: "None",
                        },
                        allergies: [],
                        conditions: [],
                        medications: [],
                        timeline: [],
                    });
                    setUsingFallbackDossier(true);
                    setError(null);
                    return;
                }
            } catch (fallbackErr) {
                console.error("Fallback roster lookup failed:", fallbackErr);
            }

            setError(err?.response?.data?.message || "Access restricted. Clinical relationship required.");
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

    useEffect(() => {
        if (searchParams.get("openRemark") === "true") {
            setShowRemarkModal(true);
        }
    }, [searchParams]);

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

    const { identity } = dossier;

    return (
        <div className="patient-dashboard-grid-bg py-4 px-3 px-md-5">
            <div className="mx-auto" style={{ maxWidth: '1440px' }}>
                
                {/* MATERIALLY MATCHED IDENTITY CARD */}
                {usingFallbackDossier && (
                    <div className="alert alert-warning border-0 rounded-4 shadow-sm mb-4" role="alert">
                        Limited profile mode: full dossier could not be loaded for this patient.
                    </div>
                )}
                <div className="nn-card mb-6 border-0">
                    <div className="d-flex flex-wrap flex-lg-nowrap gap-4">
                        {/* Avatar Col */}
                        <div className="d-flex flex-column align-items-center gap-3 pe-lg-3">
                            <div className="patient-img-large overflow-hidden">
                                {identity.profile_image && !imageError ? (
                                    <img src={toAssetUrl(identity.profile_image)} alt={identity.full_name} className="w-100 h-100 object-fit-cover" onError={() => setImageError(true)}/>
                                ) : (
                                    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary"><User size={64} /></div>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <div className="nn-badge nn-badge-danger d-flex align-items-center fw-bold"><span className="me-1">🚫</span> Alcohol</div>
                                <div className="nn-badge nn-badge-danger d-flex align-items-center fw-bold"><span className="me-1">🚬</span> Smoker</div>
                            </div>
                        </div>

                        {/* Details Col */}
                        <div className="flex-grow-1 d-flex flex-column justify-content-between gap-4">
                            {/* Top row */}
                            <div className="d-flex justify-content-between align-items-start w-100">
                                <div>
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <h2 className="fw-black text-dark mb-0" style={{fontSize: '1.4rem'}}>{identity.full_name}</h2>
                                        <div className="d-flex gap-2">
                                            <button className="btn btn-light btn-sm rounded-circle p-2 shadow-sm border border-light d-flex align-items-center justify-content-center"><Phone size={14} className="text-secondary"/></button>
                                            <button className="btn btn-light btn-sm rounded-circle p-2 shadow-sm border border-light d-flex align-items-center justify-content-center"><Mail size={14} className="text-secondary"/></button>
                                        </div>
                                    </div>
                                    <div className="d-flex flex-wrap gap-4 text-dark fw-bold" style={{fontSize: '0.8rem'}}>
                                        <span className="d-flex align-items-center gap-2"><User size={14} className="text-secondary"/> {identity.gender || 'Not Specified'}</span>
                                        <span className="d-flex align-items-center gap-2"><MapPin size={14} className="text-secondary"/> {identity.city || 'Elshiekh zayed, Giza'}</span>
                                        <span className="d-flex align-items-center gap-2"><Briefcase size={14} className="text-secondary"/> {identity.occupation || 'Accountant'}</span>
                                        <span className="d-flex align-items-center gap-2"><Calendar size={14} className="text-secondary"/> 12 Dec 1992 (38 years)</span>
                                    </div>
                                </div>
                                
                                <button className="nn-btn nn-btn-secondary d-flex align-items-center gap-2">
                                    <Edit3 size={14} /> Edit
                                </button>
                            </div>

                            {/* Bottom row: Vitals + Tags */}
                            <div className="d-flex flex-wrap flex-xl-nowrap justify-content-between align-items-center gap-4">
                                {/* Vitals Box */}
                                <div className="d-flex flex-wrap justify-content-center align-items-center p-3 px-4 rounded-4 w-100 w-xl-auto" style={{border: '1.5px dashed #e2e8f0', gap: 'max(15px, 2vw)', backgroundColor: '#ffffff'}}>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>22.4</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            BMI <span className="text-success ms-1">▼ 10</span>
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>92</span>
                                            <span className="fw-bold text-muted" style={{fontSize: '0.75rem'}}>kg</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Weight <span className="text-success ms-1">▼ 10 kg</span>
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>175</span>
                                            <span className="fw-bold text-muted" style={{fontSize: '0.75rem'}}>Cm</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Height
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>124/80</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Blood pressure <span className="text-danger ms-1">▲ 10</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="d-flex flex-column align-items-xl-end align-items-center gap-3 w-100 w-xl-auto mt-3 mt-xl-0 text-center text-xl-end">
                                    <div className="d-flex flex-column align-items-center align-items-xl-end gap-1">
                                        <span className="text-dark fw-bolder mb-1" style={{fontSize: '0.75rem'}}>Own diagnosis</span>
                                        <div className="d-flex gap-2">
                                            <span className="nn-badge nn-badge-warning">Obesity</span>
                                            <span className="nn-badge nn-badge-warning">Uncontrolled Type 2</span>
                                        </div>
                                    </div>
                                    <div className="d-flex flex-column align-items-center align-items-xl-end gap-1">
                                        <span className="text-dark fw-bolder mb-1" style={{fontSize: '0.75rem'}}>Health barriers</span>
                                        <div className="d-flex gap-2">
                                            <span className="nn-badge nn-badge-info">Fear of medication</span>
                                            <span className="nn-badge nn-badge-info">Fear of insulin</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE ROW Grid */}
                <div className="row g-4 mb-4">
                    {/* TIMELINE */}
                    <div className="col-12 col-lg-4">
                        <div className="nn-card h-100 p-0 overflow-hidden">
                            <div className="panel-header px-6 pt-6 pb-2">
                                <div className="panel-title"><Calendar size={18} /> Timeline</div>
                                <button className="panel-edit-btn">Edit</button>
                            </div>
                            <div className="pt-2">
                                <div className="timeline-row">
                                    <div className="timeline-left"><span>Dec</span><span>2022</span></div>
                                    <div className="timeline-center"><div className="timeline-marker"></div></div>
                                    <div className="timeline-right">
                                        <div className="timeline-title">Pre-diabetic</div>
                                        <div className="timeline-subtitle">A1c : 10.4</div>
                                    </div>
                                </div>
                                <div className="timeline-row">
                                    <div className="timeline-left"><span>Jan</span><span>2022</span></div>
                                    <div className="timeline-center"><div className="timeline-marker"></div></div>
                                    <div className="timeline-right">
                                        <div className="timeline-title">Type 2</div>
                                        <div className="timeline-subtitle">A1c : 10.4</div>
                                    </div>
                                </div>
                                <div className="timeline-row">
                                    <div className="timeline-left"><span>Jul</span><span>2021</span></div>
                                    <div className="timeline-center"><div className="timeline-marker"></div></div>
                                    <div className="timeline-right">
                                        <div className="timeline-title">Chronic thyroid disorder</div>
                                        <div className="timeline-subtitle">A1c : 10.4</div>
                                    </div>
                                </div>
                                <div className="timeline-row">
                                    <div className="timeline-left"><span>Jul</span><span>2021</span></div>
                                    <div className="timeline-center"><div className="timeline-marker"></div></div>
                                    <div className="timeline-right">
                                        <div className="timeline-title">Angina Pectoris</div>
                                        <div className="timeline-subtitle">A1c : 10.4</div>
                                    </div>
                                </div>
                                <div className="timeline-row">
                                    <div className="timeline-left"><span>Jul</span><span>2021</span></div>
                                    <div className="timeline-center"><div className="timeline-marker" style={{borderColor: '#2b70ff'}}></div></div>
                                    <div className="timeline-right">
                                        <div className="timeline-title">Stroke</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MEDICAL HISTORY */}
                    <div className="col-12 col-lg-8">
                        <div className="nn-card h-100 p-0 overflow-hidden">
                            <div className="panel-header px-6 pt-6 pb-2">
                                <div className="panel-title"><Activity size={18} /> Medical history</div>
                                <button className="panel-edit-btn">Edit</button>
                            </div>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><Heart size={14} /></div>
                                            <span className="med-history-title">chronic disease</span>
                                        </div>
                                        <div className="med-history-data">IHD, Obesity, Chronic thyroid disorder</div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><Droplet size={14} /></div>
                                            <span className="med-history-title">Diabetes Emergencies</span>
                                        </div>
                                        <div className="med-history-data">Diabetic Ketoacidosis</div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><Activity size={14} /></div>
                                            <span className="med-history-title">Sugery</span>
                                        </div>
                                        <div className="med-history-data">Liposuction</div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><User size={14} /></div>
                                            <span className="med-history-title">Family disease</span>
                                        </div>
                                        <div className="med-history-data">Obesity (Father)</div>
                                    </div>
                                </div>
                                <div className="col-12">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><Zap size={14} /></div>
                                            <span className="med-history-title">Diabetes related complication</span>
                                        </div>
                                        <div className="med-history-data">Nephropathy, Neuropathy, Retinopathy, Diabetic foot, Sexual dysfunction</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW Grid */}
                <div className="row g-4 mb-5">
                    {/* MEDICATIONS */}
                    <div className="col-12 col-lg-8">
                        <div className="nn-card h-100 p-0 overflow-hidden d-flex flex-column">
                            <div className="panel-header px-6 pt-6 pb-2 m-0 border-0">
                                <div className="panel-title"><Pill size={18} /> Medications</div>
                                <button className="panel-edit-btn">Edit</button>
                            </div>
                            <div className="nn-table-wrapper flex-grow-1 border-top-0 rounded-0">
                                <table className="nn-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Name <ChevronRight size={10} style={{transform: 'rotate(90deg)', verticalAlign: 'middle'}}/></th>
                                            <th>Ind.</th>
                                            <th>Status</th>
                                            <th>Sig.</th>
                                            <th>Start date</th>
                                            <th>Assign by</th>
                                            <th>Note</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded p-2 text-secondary"><Pill size={18}/></div>
                                                    <div>
                                                        <div className="fw-black text-dark" style={{fontSize: '0.85rem'}}>ACTRAPID ® HM 1</div>
                                                        <div className="text-muted small" style={{fontSize: '0.75rem'}}>Amaryl 1 mg</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><ShieldAlert size={16} className="text-secondary"/></td>
                                            <td><span className="nn-badge nn-badge-success">Adherent</span></td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td><span className="nn-badge">Patient</span></td>
                                            <td>-</td>
                                            <td><MoreHorizontal size={16} className="text-secondary" style={{cursor: 'pointer'}}/></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded p-2 text-primary"><Droplet size={18}/></div>
                                                    <div>
                                                        <div className="fw-black text-dark" style={{fontSize: '0.85rem'}}>Panadol 1000m</div>
                                                        <div className="text-muted small" style={{fontSize: '0.75rem'}}>Vitacid 1000m</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><ShieldAlert size={16} className="text-primary"/></td>
                                            <td><span className="nn-badge nn-badge-info">Somehow adherent</span></td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td><span className="nn-badge">Patient</span></td>
                                            <td>-</td>
                                            <td><MoreHorizontal size={16} className="text-secondary" style={{cursor: 'pointer'}}/></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded p-2 text-danger"><Stethoscope size={18}/></div>
                                                    <div>
                                                        <div className="fw-black text-dark" style={{fontSize: '0.85rem'}}>Amaryl 1 mg</div>
                                                        <div className="text-muted small" style={{fontSize: '0.75rem'}}>Amaryl 1 mg</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><ShieldAlert size={16} className="text-secondary"/></td>
                                            <td><span className="nn-badge nn-badge-danger">Not adherent</span></td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td><span className="nn-badge">Patient</span></td>
                                            <td>-</td>
                                            <td><MoreHorizontal size={16} className="text-secondary" style={{cursor: 'pointer'}}/></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-light rounded p-2 text-secondary"><Activity size={18}/></div>
                                                    <div>
                                                        <div className="fw-black text-dark" style={{fontSize: '0.85rem'}}>Vitacid 1000m</div>
                                                        <div className="text-muted small" style={{fontSize: '0.75rem'}}>Vitacid 1000m</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><ShieldAlert size={16} className="text-secondary"/></td>
                                            <td><span className="nn-badge nn-badge-success">Adherent</span></td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td><span className="nn-badge">Patient</span></td>
                                            <td>-</td>
                                            <td><MoreHorizontal size={16} className="text-secondary" style={{cursor: 'pointer'}}/></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* DIET */}
                    <div className="col-12 col-lg-4">
                        <div className="nn-card h-100 p-0 overflow-hidden">
                            <div className="panel-header px-6 pt-6 pb-2 mb-3">
                                <div className="panel-title"><Utensils size={18} /> Diet</div>
                                <button className="nn-btn nn-btn-secondary p-1 px-3 d-flex align-items-center gap-1" style={{fontSize: '0.75rem'}}><Plus size={14}/> Notes</button>
                            </div>
                            <div className="d-flex flex-column pt-1">
                                <div className="row g-2 mb-2">
                                    <div className="col-6">
                                        <div className="diet-list-item justify-content-center">
                                            <Droplet size={14} className="text-secondary"/> <span className="fw-black">8 Cups</span> <span className="text-muted fw-bold" style={{fontSize: '0.65rem'}}>- per day</span>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="diet-list-item justify-content-center">
                                            {/* Coffee icon placeholder */}
                                            <Utensils size={14} className="text-secondary"/> <span className="fw-black">3 Cups</span> <span className="text-muted fw-bold" style={{fontSize: '0.65rem'}}>- per day</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="diet-list-item">
                                    <Clock size={16} className="text-secondary"/> Intermittent fasting, Intermittent fasting,
                                </div>
                                <div className="diet-list-item">
                                    <AlertCircle size={16} className="text-secondary"/> Table sugar , Daily Avg 3 / 6
                                </div>
                                <div className="diet-list-item">
                                    <Zap size={16} className="text-secondary"/> Lactose, Beans
                                </div>
                                <div className="diet-list-item">
                                    <Moon size={16} className="text-secondary"/> 8 H (continues) sleeping
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
