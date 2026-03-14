import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import prescriptionService from '../../services/prescriptionService';
import { getConversations } from '../../api/chat';
import MedicineRow from '../../components/prescription/MedicineRow';
import PrescriptionList from '../../components/prescription/PrescriptionList';
import Avatar from '../../components/shared/Avatar';
import { Plus, Save, FileText, Calendar, AlertCircle, User, Clock, ShieldAlert, Activity, ChevronDown, ChevronLeft, CheckCircle, X } from 'lucide-react';

const WritePrescription = ({ isEmbedded = false }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const patientIdParam = searchParams.get('patientId');
    
    // State
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientDossier, setPatientDossier] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState('');

    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [items, setItems] = useState([{ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

    // Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Fetch Patients
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const convs = await getConversations();
                const patientList = convs.map(c => c.other_user);
                const uniquePatients = Array.from(new Set(patientList.map(p => p.id)))
                    .map(id => patientList.find(p => p.id === id));
                
                setPatients(uniquePatients);

                if (patientIdParam) {
                    const found = uniquePatients.find(p => p.id === parseInt(patientIdParam));
                    if (found) setSelectedPatient(found);
                }
            } catch (err) {
                console.error("Error fetching patients:", err);
            }
        };
        fetchPatients();
    }, [patientIdParam]);

    // Fetch Dossier
    useEffect(() => {
        if (selectedPatient) {
            const fetchDossier = async () => {
                try {
                    const data = await prescriptionService.getPatientDossier(selectedPatient.id);
                    setPatientDossier(data);
                    setAppointments(data.timeline || []);
                    
                    const recentAppt = data.timeline?.[0];
                    if (recentAppt) setSelectedAppointment(recentAppt.id);
                } catch (e) {
                    console.error("Dossier fetch failed", e);
                    setPatientDossier(null);
                }
            };
            fetchDossier();
        } else {
            setPatientDossier(null);
            setAppointments([]);
            setSelectedAppointment('');
        }
    }, [selectedPatient]);

    const handleAddItem = () => {
        setItems([...items, { medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const initiateSubmit = (status) => {
        if (!diagnosis && status === 'Active') {
            setError("Diagnosis is required.");
            return;
        }
        if (status === 'Active') {
            setShowConfirmModal(true);
        } else {
            handleSubmit(null, 'Draft');
        }
    };

    const handleSubmit = async (e, status = "Active") => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);
        setShowConfirmModal(false);

        const payload = {
            patient_id: selectedPatient.id,
            appointment_id: selectedAppointment || null,
            diagnosis,
            notes,
            valid_until: validUntil || null,
            status: status,
            items: items.filter(i => i.medicine_name.trim() !== '')
        };

        try {
            await prescriptionService.createPrescription(payload);
            setSuccess(true);
            setHistoryRefreshTrigger(prev => prev + 1);
            
            // Wait a moment then clear success (optional)
            setTimeout(() => setSuccess(false), 3000);

            if (status === 'Active') {
                setDiagnosis('');
                setNotes('');
                setItems([{ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
            }
        } catch (err) {
            console.error("Failed to save:", err);
            setError(err.response?.data?.message || "Failed to save.");
        } finally {
            setLoading(false);
        }
    };

    const getAge = (dob) => {
        if (!dob || dob === 'N/A') return 'N/A';
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const activeProfile = patientDossier?.identity || selectedPatient;

    return (
        <div className={`d-flex flex-column flex-lg-row custom-scrollbar ${isEmbedded ? '' : 'px-4 pb-4'}`} style={{ gap: '24px', height: isEmbedded ? '100%' : 'calc(100vh - 120px)', minHeight: isEmbedded ? '500px' : 'auto' }}>
            {/* LEFT PANEL: FORM (70%) */}
            <div className="d-flex flex-column bg-white rounded-5 shadow-sm overflow-hidden position-relative" style={{ flex: 7 }}>
                {/* 1. Header Area - Slim Sub-header */}
                {!isEmbedded && (
                    <div className="d-flex align-items-center justify-content-between p-3 px-4 border-bottom border-light bg-white">
                        <div className="d-flex align-items-center gap-3">
                            <button
                                onClick={() => selectedPatient 
                                    ? navigate(`/doctor/patient-hub?patientId=${selectedPatient.id}`) 
                                    : navigate(-1)
                                }
                                title="Back to Clinical Dossier"
                                className="btn btn-sm btn-light rounded-circle d-flex align-items-center justify-content-center border"
                                style={{ width: '36px', height: '36px' }}
                            >
                                <ChevronLeft size={16} className="text-secondary" />
                            </button>
                            <div>
                                <span className="text-secondary small fw-bolder text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>WORKSPACE / CLINICAL SCRIPTING</span>
                                <h2 className="h6 fw-bolder mb-0 text-dark">Secure Prescription Interface</h2>
                            </div>
                        </div>

                        <div className="position-relative" style={{ minWidth: '260px' }}>
                            <select 
                                className="form-select form-select-sm rounded-pill bg-light border-light shadow-none fw-bold text-dark px-3 py-2"
                                style={{ paddingRight: '36px', appearance: 'none', cursor: 'pointer' }}
                                value={selectedPatient?.id || ''}
                                onChange={(e) => {
                                    const p = patients.find(pat => pat.id === parseInt(e.target.value));
                                    setSelectedPatient(p);
                                }}
                            >
                                <option value="" disabled>— Select Patient —</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.full_name || p.name || `Patient #${p.id}`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="position-absolute text-secondary" style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>
                    </div>
                )}

                {/* 2. Scrollable Content Area */}
                <div className="flex-grow-1 overflow-y-auto p-4 custom-scrollbar" style={{ paddingBottom: '100px' }}>
                    
                    {selectedPatient && activeProfile && (() => {
                        const age = getAge(activeProfile.dob);
                        const ageLabel = (!activeProfile.dob || activeProfile.dob === 'N/A' || age === 0) 
                            ? null 
                            : `${age} yrs`;
                        const lastVisitRaw = patientDossier?.timeline?.[0]?.appointment_date;
                        const lastVisit = lastVisitRaw 
                            ? new Date(lastVisitRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;

                        const Chip = ({ icon, label, bgClass = 'bg-light text-secondary', borderClass = 'border-light' }) => (
                            <span className={`badge rounded-pill d-inline-flex align-items-center gap-1 border ${bgClass} ${borderClass} px-3 py-1 fw-bold`} style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                {icon}{label}
                            </span>
                        );

                        return (
                        <div className="patient-context-card rounded-4 mb-4" style={{ background: 'linear-gradient(105deg, #ffffff 60%, rgba(13, 110, 253, 0.05))', borderLeft: '5px solid var(--bs-primary)' }}>
                            <div className="d-flex flex-column flex-md-row gap-4 p-4 align-items-md-center">
                                {/* Avatar */}
                                <div className="position-relative flex-shrink-0">
                                    <Avatar 
                                        src={activeProfile.profile_image} 
                                        alt={activeProfile.full_name} 
                                        style={{ width: 72, height: 72, borderRadius: '20px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' }} 
                                    />
                                    <div className="position-absolute bg-success border border-white border-3 rounded-circle" style={{ bottom: '-4px', right: '-4px', width: '20px', height: '20px' }}></div>
                                </div>

                                {/* Info */}
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <h3 className="fw-bolder text-dark mb-0 fs-4 lh-1">
                                            {activeProfile.full_name}
                                        </h3>
                                        <span className="badge bg-light text-secondary border border-light rounded-pill px-2" style={{ fontSize: '0.7rem' }}>#PID-{activeProfile.id}</span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {activeProfile.gender && (
                                            <Chip icon={<User size={12} />} label={activeProfile.gender} />
                                        )}
                                        {ageLabel && (
                                            <Chip icon={<Clock size={12} />} label={ageLabel} />
                                        )}
                                        {lastVisit && (
                                            <Chip icon={<Calendar size={12} className="text-primary" />} label={`Last visit: ${lastVisit}`} bgClass="bg-primary bg-opacity-10 text-primary" borderClass="border-primary border-opacity-25" />
                                        )}
                                    </div>
                                </div>

                                {/* Alert Badges */}
                                <div className="d-flex flex-column gap-2 flex-shrink-0 align-items-md-end">
                                    {activeProfile.allergies && activeProfile.allergies !== 'None' && (
                                        <div className="badge bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-2">
                                            <ShieldAlert size={14} /> {activeProfile.allergies}
                                        </div>
                                    )}
                                    {activeProfile.chronic_conditions && activeProfile.chronic_conditions !== 'None' && (
                                        <div className="badge bg-warning bg-opacity-10 border border-warning border-opacity-25 text-warning rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-2 text-dark">
                                            <Activity size={14} /> {activeProfile.chronic_conditions}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {selectedPatient ? (
                        <form onSubmit={(e) => e.preventDefault()} className="d-flex flex-column gap-4">
                            
                            <div className="row g-4">
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-bold mb-2 small">Clinical Diagnosis <span className="text-danger">*</span></label>
                                    <div className="position-relative">
                                        <input 
                                            type="text" 
                                            className="form-control form-control-lg bg-light border-light shadow-sm rounded-4 text-dark fw-medium fs-6" 
                                            placeholder="Enter primary condition..."
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            style={{ paddingLeft: '48px' }}
                                            autoFocus
                                        />
                                        <Activity size={20} className="position-absolute text-secondary" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-bold mb-2 small">Prescription Validity</label>
                                    <div className="position-relative">
                                        <input 
                                            type="date" 
                                            className="form-control form-control-lg bg-light border-light shadow-sm rounded-4 text-dark fw-medium fs-6" 
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                            style={{ paddingLeft: '48px', height: '100%' }}
                                        />
                                        <Calendar size={20} className="position-absolute text-secondary" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="form-label text-dark fw-bold mb-2 small d-flex align-items-center gap-2">
                                    <Calendar size={14} className="text-secondary" /> Link Appointment
                                </label>
                                <div className="position-relative">
                                    <select 
                                        className="form-select bg-light border-light shadow-sm rounded-4 fw-medium text-dark px-3 py-2" 
                                        value={selectedAppointment}
                                        onChange={(e) => setSelectedAppointment(e.target.value)}
                                    >
                                        <option value="">-- General Prescription --</option>
                                        {appointments.map(appt => (
                                            <option key={appt.id} value={appt.id}>
                                                {appt.appointment_date} — {appt.reason} ({appt.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr className="my-2 border-light opacity-100" />

                            <div>
                                <div className="bg-light bg-opacity-50 p-4 p-md-5 rounded-5 border border-dashed border-2 border-primary border-opacity-25">
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                                        <div>
                                            <h3 className="h5 fw-bolder text-dark mb-1 d-flex align-items-center gap-2 lh-1">
                                                <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                                    <ShieldAlert size={18} />
                                                </div>
                                                Medication Regimen
                                            </h3>
                                            <p className="text-secondary small fw-medium mb-0 ms-md-5 ps-md-1">Specify drugs, dosages, and administration intervals.</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn btn-dark rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" 
                                            onClick={handleAddItem} 
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            <Plus size={16} /> Add Medication
                                        </button>
                                    </div>

                                    <div className="d-flex flex-column">
                                        {items.map((item, idx) => (
                                            <MedicineRow 
                                                key={idx} 
                                                index={idx} 
                                                item={item} 
                                                onChange={handleItemChange} 
                                                onRemove={handleRemoveItem} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="form-label text-dark fw-bold mb-2 small d-flex align-items-center gap-2">
                                    <FileText size={16} className="text-secondary" /> Extended Clinical Notes
                                </label>
                                <textarea 
                                    className={`form-control bg-light border-light shadow-sm rounded-4 text-dark px-4 py-3 pb-4 ${!notes ? 'fst-italic fw-medium text-secondary' : 'fw-medium'}`}
                                    rows="4"
                                    placeholder="Briefly document findings, patient instructions, or special observations..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{ lineHeight: '1.6', resize: 'vertical' }}
                                />
                            </div>

                        </form>
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 my-5 text-center">
                            <div className="position-relative mb-4" style={{ width: '120px', height: '120px' }}>
                                <div className="position-absolute top-0 bottom-0 start-0 end-0 bg-primary bg-opacity-10 rounded-circle pulse-animation"></div>
                                <div className="position-absolute top-50 start-50 translate-middle bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-lg" style={{ width: '80px', height: '80px' }}>
                                    <User size={36} />
                                </div>
                            </div>
                            <h2 className="fs-3 fw-bolder text-dark mb-2">Clinical Session Idle</h2>
                            <p className="text-secondary fw-medium mx-auto" style={{ maxWidth: '300px', lineHeight: '1.6' }}>Select a patient from the search nexus above to initiate a new prescription script.</p>
                        </div>
                    )}
                </div>

                {/* 3. Sticky Action Footer */}
                {selectedPatient && (
                    <div className="position-absolute bottom-0 start-0 end-0 bg-white border-top border-light p-3 px-4 d-flex align-items-center justify-content-between z-3 shadow-sm">
                        <div className="d-flex align-items-center gap-3">
                            {success && (
                                <span className="text-success small fw-bolder d-flex align-items-center gap-1 fade-in">
                                    <CheckCircle size={16} /> Saved!
                                </span>
                            )}
                             {error && (
                                <span className="text-danger small fw-bolder d-flex align-items-center gap-1 fade-in">
                                    <AlertCircle size={16} /> {error}
                                </span>
                            )}
                        </div>
                        
                        <div className="d-flex gap-3">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary rounded-pill px-4 fw-bold shadow-sm bg-white"
                                onClick={() => initiateSubmit('Draft')}
                                disabled={loading}
                            >
                                Save Draft
                            </button>

                            <button 
                                type="button" 
                                className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" 
                                onClick={() => initiateSubmit('Active')}
                                disabled={loading} 
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Processing...
                                    </>
                                ) : 'Issue Prescription'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL */}
            <div className="d-flex flex-column bg-white rounded-5 shadow-sm overflow-hidden position-relative border border-light" style={{ flex: 3 }}>
                <div className="p-3 px-4 border-bottom border-light bg-light">
                    <div className="d-flex align-items-center gap-2">
                        <Clock size={16} className="text-secondary" />
                        <h3 className="mb-0 text-dark fw-bolder text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>Script History</h3>
                    </div>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                    <PrescriptionList 
                        patientId={selectedPatient?.id} 
                        refreshTrigger={historyRefreshTrigger}
                    />
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div className="position-fixed top-0 bottom-0 start-0 end-0 bg-dark bg-opacity-50 z-3 d-flex align-items-center justify-content-center p-4">
                    <div className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100 fade-in" style={{ maxWidth: '500px' }}>
                        <h3 className="h4 fw-bolder text-dark mb-3">Issue Prescription?</h3>
                        <p className="text-secondary fw-medium mb-4" style={{ lineHeight: '1.6' }}>
                            This will finalize the prescription and make it visible to the patient. 
                            Are you sure the diagnosis and medicines are correct?
                        </p>
                        
                        <div className="d-flex justify-content-end gap-3">
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                className="btn btn-light rounded-pill px-4 fw-bold text-secondary border border-light"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={(e) => handleSubmit(e, 'Active')}
                                className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
                            >
                                Confirm & Issue
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .pulse-animation { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                .fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default WritePrescription;
