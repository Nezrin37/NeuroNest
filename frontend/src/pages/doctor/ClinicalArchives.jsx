import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
    getPatientDossier, 
    getClinicalRemarks
} from "../../api/doctor";
import { 
    Calendar, ChevronLeft, StickyNote, FileText, Clock
} from "lucide-react";

const ClinicalArchivesPage = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId");
    const navigate = useNavigate();
    
    const [dossier, setDossier] = useState(null);
    const [remarksList, setRemarksList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getPatientDossier(patientId);
            setDossier(data);
            const remarksData = await getClinicalRemarks(patientId);
            setRemarksList(remarksData);
            setError(null);
        } catch (err) {
            console.error("Error fetching dossier:", err);
            setError("Unable to load clinical archive.");
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

    const handleBack = () => {
        if (patientId) {
            navigate(`/doctor/patient-hub?patientId=${patientId}`);
        } else {
            navigate(-1);
        }
    };

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 gap-3 bg-light">
            <div className="spinner-border text-primary border-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary fw-bold text-uppercase" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Decrypting Clinical Stream...</p>
        </div>
    );
    
    if (error || !dossier) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center p-4 bg-light">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                <StickyNote size={40} />
            </div>
            <h2 className="fs-3 fw-bolder text-dark mb-2">Access Restricted</h2>
            <p className="text-secondary mb-4">{error}</p>
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-dark rounded-pill px-5 py-2 fw-bold shadow-sm"
            >
                Return
            </button>
        </div>
    );

    const { identity } = dossier;

    return (
        <div className="container-fluid py-4 min-vh-100 bg-light" style={{ maxWidth: '1000px' }}>
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5 pb-3 border-bottom border-light" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <div className="d-flex align-items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="btn btn-sm btn-white bg-white border-0 shadow-sm rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '40px', height: '40px' }}
                    >
                        <ChevronLeft size={20} className="text-dark" />
                    </button>
                    <div>
                        <div className="text-secondary small fw-medium text-uppercase mb-1" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Clinical Dossier / Archives</div>
                        <h1 className="h4 fw-bolder text-dark mb-0">Clinical Archives</h1>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-3 bg-white px-3 py-2 rounded-pill shadow-sm border border-light">
                    <div className="bg-primary bg-opacity-10 text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                        {identity.full_name ? identity.full_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="d-flex flex-column">
                        <span className="fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem', maxWidth: '150px' }}>{identity.full_name}</span>
                        <span className="text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>#PID-{identity.id}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-5 shadow-sm border-0 p-4 p-md-5 mb-5">
                
                {/* Count Bar */}
                {remarksList.length > 0 && (
                    <div className="d-flex align-items-center mb-4">
                        <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 rounded-pill px-3 py-2 border border-primary border-opacity-25">
                            <FileText size={16} className="text-primary" />
                            <span className="small fw-bold text-primary">
                                {remarksList.length} Clinical {remarksList.length === 1 ? 'Remark' : 'Remarks'}
                            </span>
                        </div>
                    </div>
                )}

                {remarksList.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5 my-4 bg-light rounded-4 border border-dashed border-2 text-secondary text-center">
                        <div className="bg-white rounded-4 d-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
                            <StickyNote size={36} className="text-secondary opacity-50" />
                        </div>
                        <h4 className="h5 fw-bolder text-dark mb-2">Archives Empty</h4>
                        <p className="small text-secondary mb-0">No internalized clinical remarks have been recorded for this patient.</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-4">
                        {remarksList.map((remark) => (
                            <div 
                                key={remark.id} 
                                className="card border-0 shadow-sm rounded-4 overflow-hidden position-relative hover-shadow-lg transition-all"
                                style={{ borderLeft: '4px solid #0d6efd' }} /* primary color */
                            >
                                <div className="card-body p-4 p-md-5">
                                    {/* Card Header */}
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 border-bottom border-light pb-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center border border-primary border-opacity-10 flex-shrink-0" style={{ width: '45px', height: '45px' }}>
                                                <StickyNote size={20} />
                                            </div>
                                            <div>
                                                <div className="text-secondary small fw-bolder text-uppercase mb-1" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                                                    Clinical Remark
                                                </div>
                                                <div className="d-flex align-items-center gap-2 text-primary fw-bolder small">
                                                    <Calendar size={14} />
                                                    {new Date(remark.created_at).toLocaleDateString('en-US', { 
                                                        month: 'long', day: 'numeric', year: 'numeric' 
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="badge bg-light text-secondary border fw-bold px-3 py-2 rounded-pill" style={{ letterSpacing: '1px' }}>
                                            Ref #{String(remark.id).padStart(4, '0')}
                                        </span>
                                    </div>

                                    {/* Remark Content */}
                                    <div className="bg-light bg-opacity-50 text-dark p-4 rounded-4 border fw-medium lh-lg mb-4" style={{ fontSize: '0.95rem' }}>
                                        {remark.content}
                                    </div>

                                    {/* Footer */}
                                    <div className="d-flex align-items-center gap-2 text-secondary small fw-bold mt-2">
                                        <Clock size={14} />
                                        <span>{new Date(remark.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="mx-2 opacity-50">•</span>
                                        <span>Recorded by Dr. {identity.full_name ? identity.full_name.split(' ')[0] : 'Physician'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
                .hover-shadow-lg { transition: all 0.3s ease; }
                .hover-shadow-lg:hover { transform: translateY(-3px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.08)!important; }
            `}</style>
        </div>
    );
};

export default ClinicalArchivesPage;
