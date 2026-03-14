import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    Calendar, FileText, Edit3, ShieldCheck, Activity, MessageSquare, 
    ChevronLeft, Mail, Phone, User, Plus, Folder,
    Settings, MoreHorizontal, Bell, ChevronRight
} from 'lucide-react';
import { getPatientDossier, getPatients } from '../../api/doctor';
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
                setLoading(true);
                const data = await getPatientDossier(patientId);
                setDossier(data);
            } catch (err) {
                console.error("Failed to fetch patient dossier for hub", err);
                try {
                    // Fallback to roster info
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
                                dob: match.dob || "N/A",
                                blood_group: match.blood_group || "N/A"
                            }
                        });
                    }
                } catch (fallbackErr) {
                    console.error("Hub fallback failed", fallbackErr);
                }
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
            path: `/doctor/patient-timeline?patientId=${patientId}`
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
            path: `/doctor/assessment-reports?patientId=${patientId}`
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
            id: 'alerts',
            title: 'Clinical Alerts',
            desc: 'Critical notices & reminders',
            icon: <Bell size={22} />,
            color: '#f97316',
            path: `/doctor/alerts?patientId=${patientId}`
        },
        {
            id: 'archives',
            title: 'Clinical Archives',
            desc: 'Medical records & historical data',
            icon: <Folder size={22} />,
            color: '#64748b',
            path: `/doctor/clinical-archives?patientId=${patientId}`
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
        <div className={`patient-hub-root min-vh-100 px-3 px-md-4 pb-4 pt-0 ${isDark ? 'dark' : ''}`}>
            <div className="hub-main-card bg-white p-3 p-md-4 mt-n3" style={{ 
                borderRadius: '24px', 
                border: '1px solid var(--nn-border)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                minHeight: 'calc(100vh - 120px)'
            }}>
                <div className="container-fluid p-0">
                
                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="fw-black text-dark mb-0" style={{ fontSize: '2.2rem', letterSpacing: '-0.02em' }}>Clinical Dossier</h1>
                    <button 
                        onClick={() => navigate('/doctor/patients')}
                        className="btn btn-light bg-white border border-light shadow-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 text-muted hover-primary-text transition-all fw-bold"
                        style={{ fontSize: '0.8rem' }}
                    >
                        <ChevronLeft size={16} /> Back to Roster
                    </button>
                </div>

                <div className="row g-4 pt-2">
                    {/* Left Panel: Profile Detail */}
                    <div className="col-12 col-lg-4">
                        <div className="hub-identity-card p-3 rounded-5 bg-white border-0 shadow-sm h-100 d-flex flex-column">
                            
                            {/* Avatar & Basic Info - Horizontal Layout */}
                            <div className="d-flex align-items-center gap-3 mb-4 mt-2 px-1">
                                <div className="avatar-frame rounded-circle overflow-hidden shadow-sm flex-shrink-0" style={{ width: '64px', height: '64px' }}>
                                    {identity.profile_image && !imageError ? (
                                        <img 
                                            src={toAssetUrl(identity.profile_image)} 
                                            alt={identity.full_name} 
                                            className="w-100 h-100 object-fit-cover"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-100 h-100 transition-all d-flex align-items-center justify-content-center bg-light text-muted">
                                            <User size={32} strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-start">
                                    <h2 className="fw-black text-dark mb-1" style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>{identity.full_name || "Patient Name"}</h2>
                                    <span className="badge px-2 py-1 rounded-pill text-uppercase fw-black letter-spacing-1 bg-light text-secondary border overflow-hidden" style={{ fontSize: '0.6rem' }}>
                                        ID #{String(patientId).padStart(3, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Detailed Info List */}
                            <div className="clinical-data-list flex-grow-1 d-flex flex-column justify-content-center gap-4 mb-4 px-1">
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
                            <div className="mt-auto pt-2">
                                <button 
                                    onClick={() => navigate(`/doctor/patient-records?patientId=${patientId}&openRemark=true`)}
                                    className="btn btn-primary rounded-pill py-3 w-100 fw-black d-flex align-items-center justify-content-center gap-2 shadow-sm" style={{ fontSize: '0.9rem' }}>
                                    <Edit3 size={18} /> Add Remark
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
                                        className={`action-hub-card p-3 rounded-5 bg-white border-0 shadow-sm d-flex align-items-center gap-3 transition-all group ${action.hoverBlue ? 'hover-blue-glow' : ''}`}
                                        style={{ cursor: 'pointer', height: '110px' }}
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
                                        <div className="action-arrow text-secondary opacity-50 group-hover-visible transition-all ms-auto">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .patient-hub-root {
                    background-color: transparent;
                }
                
                .hub-main-card {
                    background-color: var(--nn-surface);
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
                    transform: translateX(5px);
                    color: #2b70ff !important;
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
        </div>
    );
};

export default PatientHub;
