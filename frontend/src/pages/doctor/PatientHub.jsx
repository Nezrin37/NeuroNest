import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    Calendar, FileText, Edit3, ShieldCheck, Activity, MessageSquare, 
    ChevronLeft, Mail, Phone, User, Plus, Folder, ArrowRight,
    Settings, MoreHorizontal
} from 'lucide-react';
import { getPatientDossier } from '../../api/doctor';
import { toAssetUrl } from '../../utils/media';
import { useTheme } from "../../context/ThemeContext";

const PatientHub = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId");
    const navigate = useNavigate();
    const { isDark } = useTheme();
    
    const [dossier, setDossier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!patientId) {
            navigate('/doctor/patients');
            return;
        }

        const fetchFullDossier = async () => {
            try {
                const data = await getPatientDossier(patientId);
                setDossier(data);
            } catch (err) {
                console.error("Failed to fetch patient dossier for hub", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFullDossier();
    }, [patientId, navigate]);

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-white">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 fs-6 fw-bold text-muted" style={{ letterSpacing: '1px' }}>Synchronizing Clinical Dossier...</p>
        </div>
    );

    const identity = dossier?.identity || {};
    
    const HUB_ACTIONS = [
        {
            id: 'timeline',
            title: 'Clinical Timeline',
            desc: '13 Recorded Encounters',
            icon: <Calendar size={22} />,
            color: '#2b70ff',
            path: `/doctor/patient-records?patientId=${patientId}`
        },
        {
            id: 'summary',
            title: 'Medical Summary',
            desc: 'Allergies, Meds & Conditions',
            icon: <FileText size={22} />,
            color: '#8b5cf6',
            path: `/doctor/patient-records?patientId=${patientId}`
        },
        {
            id: 'prescription',
            title: 'Write Prescription',
            desc: 'Issue high-fidelity scripts',
            icon: <Edit3 size={22} />,
            color: '#10b981',
            path: `/doctor/write-prescription?patientId=${patientId}`
        },
        {
            id: 'assessments',
            title: 'Assessment Reports',
            desc: 'Clinical evaluation results',
            icon: <ShieldCheck size={22} />,
            color: '#f59e0b',
            path: `/doctor/patient-records?patientId=${patientId}`
        },
        {
            id: 'performance',
            title: 'Performance Analytics',
            desc: 'Therapeutic outcome data',
            icon: <Activity size={22} />,
            color: '#ef4444',
            path: `/doctor/performance-analytics?patientId=${patientId}`,
            hoverBlue: true
        },
        {
            id: 'chat',
            title: 'Patients Chat',
            desc: 'Clinical consultation threads',
            icon: <MessageSquare size={22} />,
            color: '#475569',
            path: `/doctor/chat?patientId=${patientId}`
        }
    ];

    return (
        <div className={`patient-hub-root min-vh-100 p-4 p-md-5 ${isDark ? 'dark' : ''}`}>
            <div className="container-xl">
                
                {/* Header Section */}
                <div className="mb-5">
                    <button 
                        onClick={() => navigate('/doctor/patients')}
                        className="btn btn-link text-decoration-none d-flex align-items-center gap-2 p-0 mb-4 text-muted hover-primary-text transition-all fw-bold"
                        style={{ fontSize: '0.9rem' }}
                    >
                        <ChevronLeft size={16} /> Back to Roster
                    </button>
                    
                    <h1 className="fw-black text-dark mb-1" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em' }}>Clinical Dossier</h1>
                    <p className="text-secondary fw-medium fs-6 opacity-75">Comprehensive medical archive and longitudinal engagement timeline.</p>
                </div>

                <div className="row g-4 pt-2">
                    {/* Left Panel: Profile Detail */}
                    <div className="col-12 col-lg-4">
                        <div className="hub-identity-card p-4 rounded-5 bg-white border-0 shadow-sm h-100 d-flex flex-column">
                            
                            {/* Avatar & Basic Info */}
                            <div className="d-flex flex-column align-items-center text-center mb-5 mt-3">
                                <div className="avatar-frame rounded-circle mb-3 overflow-hidden shadow-sm" style={{ width: '120px', height: '120px' }}>
                                    {identity.profile_image && !imageError ? (
                                        <img 
                                            src={toAssetUrl(identity.profile_image)} 
                                            alt={identity.full_name} 
                                            className="w-100 h-100 object-fit-cover"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-100 h-100 transition-all d-flex align-items-center justify-content-center bg-light text-muted">
                                            <User size={64} strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>
                                <h2 className="fw-black text-dark h3 mb-1">{identity.full_name || "Patient Name"}</h2>
                                <span className="badge px-3 py-1 rounded-pill text-uppercase fw-black letter-spacing-1 bg-light text-secondary border overflow-hidden" style={{ fontSize: '0.65rem' }}>
                                    Patient ID #{String(patientId).padStart(3, '0')}
                                </span>
                            </div>

                            {/* Detailed Info List */}
                            <div className="clinical-data-list d-flex flex-column gap-4 mb-auto px-2">
                                <div className="data-item d-flex align-items-center gap-3">
                                    <div className="data-icon bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <Mail size={16} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="m-0 text-uppercase fw-black text-muted mb-0" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>Email Access</p>
                                        <p className="m-0 fw-black text-dark" style={{ fontSize: '0.85rem' }}>{identity.email || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="data-item d-flex align-items-center gap-3">
                                    <div className="data-icon bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <Phone size={16} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="m-0 text-uppercase fw-black text-muted mb-0" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>Clinical Contact</p>
                                        <p className="m-0 fw-black text-dark" style={{ fontSize: '0.85rem' }}>{identity.phone || "1234567890"}</p>
                                    </div>
                                </div>

                                <div className="data-item d-flex align-items-center gap-3">
                                    <div className="data-icon bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <Calendar size={16} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="m-0 text-uppercase fw-black text-muted mb-0" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>Date of Birth</p>
                                        <p className="m-0 fw-black text-dark" style={{ fontSize: '0.85rem' }}>{identity.dob || "Unknown"}</p>
                                    </div>
                                </div>

                                <div className="data-item d-flex align-items-center gap-3">
                                    <div className="data-icon bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <User size={16} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="m-0 text-uppercase fw-black text-muted mb-0" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>Clinical Profile</p>
                                        <p className="m-0 fw-black text-dark" style={{ fontSize: '0.85rem' }}>{identity.gender || "N/A"} ({identity.blood_group || "O-"})</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="d-flex flex-column gap-2 mt-5">
                                <button className="btn btn-primary rounded-pill py-3 fw-black d-flex align-items-center justify-content-center gap-2 shadow-sm" style={{ fontSize: '0.9rem' }}>
                                    <Edit3 size={18} /> Add Remark
                                </button>
                                <button 
                                    onClick={() => navigate(`/doctor/clinical-archives?patientId=${patientId}`)}
                                    className="btn btn-white bg-white border border-light rounded-pill py-3 fw-black d-flex align-items-center justify-content-center gap-2 shadow-sm text-secondary" style={{ fontSize: '0.9rem' }}>
                                    <Folder size={18} /> Clinical Archives
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Action Grid */}
                    <div className="col-12 col-lg-8">
                        <div className="row g-4">
                            {HUB_ACTIONS.map(action => (
                                <div className="col-12 col-md-6" key={action.id}>
                                    <div 
                                        onClick={() => navigate(action.path)}
                                        className={`action-hub-card p-4 rounded-5 bg-white border-0 shadow-sm d-flex align-items-center gap-4 transition-all group ${action.hoverBlue ? 'hover-blue-glow' : ''}`}
                                        style={{ cursor: 'pointer', height: '124px' }}
                                    >
                                        <div 
                                            className="action-icon-box rounded-4 d-flex align-items-center justify-content-center"
                                            style={{ 
                                                width: '64px', height: '64px', 
                                                backgroundColor: `${action.color}10`, 
                                                color: action.color,
                                                minWidth: '64px'
                                            }}
                                        >
                                            {action.icon}
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <h3 className="fw-black text-dark mb-1 h5 text-truncate">{action.title}</h3>
                                            <p className="text-secondary small fw-bold opacity-75 mb-0 text-truncate">{action.desc}</p>
                                        </div>
                                        {action.hoverBlue && (
                                            <div className="action-arrow text-primary opacity-0 group-hover-visible transition-all">
                                                <ArrowRight size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .patient-hub-root {
                    background-color: #f8fafc;
                }
                
                .hover-primary-text:hover {
                    color: #2b70ff !important;
                }
                
                .letter-spacing-1 {
                    letter-spacing: 1px;
                }
                
                .action-hub-card {
                    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                
                .action-hub-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.06) !important;
                }

                .hover-blue-glow:hover {
                    outline: 2px solid #2b70ff;
                    outline-offset: -2px;
                }
                
                .hub-identity-card {
                    transition: all 0.4s ease;
                }

                .group-hover-visible {
                    opacity: 0;
                    transform: translateX(-10px);
                }
                
                .action-hub-card:hover .group-hover-visible {
                    opacity: 1;
                    transform: translateX(0);
                }

                .btn-white:hover {
                    background-color: #f1f5f9;
                    border-color: #cbd5e1;
                }

                .fw-black {
                    font-weight: 800;
                }
                
                @media (max-width: 991.98px) {
                    .hub-identity-card {
                        min-height: auto;
                    }
                }
            `}</style>
        </div>
    );
};

export default PatientHub;
