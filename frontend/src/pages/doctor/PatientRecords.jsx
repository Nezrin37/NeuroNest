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
import MedicalRecordTable from "../../components/patient/medicalRecords/MedicalRecordTable";
import UploadMedicalRecordModal from "../../components/patient/medicalRecords/UploadMedicalRecordModal";
import DeleteConfirmationModal from "../../components/patient/medicalRecords/DeleteConfirmationModal";
import ViewMedicalRecordModal from "../../components/patient/medicalRecords/ViewMedicalRecordModal";
import RecordFilters from "../../components/patient/medicalRecords/RecordFilters";
import medicalRecordService from "../../services/medicalRecordService";
import "../../styles/patient-records.css";
import "../../styles/medical-records.css";


const ALLERGY_REACTIONS = [
    "Rash",
    "Anaphylaxis",
    "Breathing difficulty",
    "Swelling",
    "Nausea",
    "Other",
];

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

    // Medical Records & Summary State
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [allergies, setAllergies] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [medications, setMedications] = useState([]);
    
    // Filtering State
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sourceFilter, setSourceFilter] = useState("All");

    // Modal States
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [recordToView, setRecordToView] = useState(null);
    const [allergyFormOpen, setAllergyFormOpen] = useState(false);
    const [conditionFormOpen, setConditionFormOpen] = useState(false);
    const [medicationFormOpen, setMedicationFormOpen] = useState(false);

    const [allergyForm, setAllergyForm] = useState({ allergy_name: "", reaction: "Unknown", severity: "Mild" });
    const [conditionForm, setConditionForm] = useState({ condition_name: "", status: "active", diagnosed_date: new Date().toISOString().split('T')[0], under_treatment: true });
    const [medicationForm, setMedicationForm] = useState({ 
        drug_name: "", dosage: "", frequency: "", start_date: "", end_date: "", prescribed_by: "", status: "active" 
    });


    const fetchRecords = useCallback(async () => {
        if (!patientId) return;
        try {
            setRecordsLoading(true);
            const [recs, summ, alls, conds, meds] = await Promise.all([
                medicalRecordService.getRecords(patientId),
                medicalRecordService.getSummary(patientId),
                medicalRecordService.getAllergies(patientId),
                medicalRecordService.getConditions(patientId),
                medicalRecordService.getMedications(patientId),
            ]);
            setRecords(recs);
            setSummary(summ);
            setAllergies(alls);
            setConditions(conds);
            setMedications(meds);
        } catch (err) {
            console.error("Failed to fetch records:", err);
        } finally {
            setRecordsLoading(false);
        }
    }, [patientId]);

    const fetchDossier = useCallback(async () => {
        try {
            setLoading(true);
            setImageError(false);
            setUsingFallbackDossier(false);
            const data = await getPatientDossier(patientId);
            setDossier(data);
            setError(null);
            // Also fetch the structured records
            fetchRecords();
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

    // Record Handlers
    const handleUpload = async (formData) => {
        await medicalRecordService.uploadRecord(formData, patientId);
        fetchRecords();
    };

    const handleDelete = async () => {
        if (!recordToDelete) return;
        try {
            await medicalRecordService.deleteRecord(recordToDelete.id, patientId);
            setRecords(records.filter((r) => r.id !== recordToDelete.id));
            setIsDeleteOpen(false);
            setRecordToDelete(null);
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete record.");
        }
    };

    const viewRecord = (record) => {
        setRecordToView(record);
        setIsViewOpen(true);
    };

    const downloadRecord = async (record) => {
        try {
            await medicalRecordService.downloadRecord(
                record.id,
                record.title,
                record.file_type,
                patientId
            );
        } catch {
            alert("Download failed.");
        }
    };

    // Clinical Summary Handlers
    const addAllergy = async () => {
        if (!allergyForm.allergy_name.trim()) return;
        try {
            await medicalRecordService.addAllergy(allergyForm, patientId);
            setAllergyForm({ allergy_name: "", reaction: "Unknown", severity: "Mild" });
            setAllergyFormOpen(false);
            fetchRecords();
        } catch (err) {
            alert("Failed to add allergy.");
        }
    };

    const addCondition = async () => {
        if (!conditionForm.condition_name.trim()) return;
        try {
            await medicalRecordService.addCondition(conditionForm, patientId);
            setConditionForm({ condition_name: "", status: "active", diagnosed_date: new Date().toISOString().split('T')[0], under_treatment: true });
            setConditionFormOpen(false);
            fetchRecords();
        } catch (err) {
            alert("Failed to add condition.");
        }
    };

    const addMedication = async () => {
        if (!medicationForm.drug_name.trim()) return;
        try {
            await medicalRecordService.addMedication(medicationForm, patientId);
            setMedicationForm({ drug_name: "", dosage: "", frequency: "", start_date: "", end_date: "", prescribed_by: "", status: "active" });
            setMedicationFormOpen(false);
            fetchRecords();
        } catch (err) {
            alert("Failed to add medication.");
        }
    };

    const filteredRecords = records.filter((record) => {
        const matchesSearch =
            (record.title && record.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (record.doctor_name && record.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory =
            categoryFilter === "All" || (record.category || "").toLowerCase() === categoryFilter.toLowerCase();
        const matchesSource =
            sourceFilter === "All" ||
            (sourceFilter === "patient" && (!record.uploaded_by || record.uploaded_by === record.patient_id)) ||
            (sourceFilter === "doctor" && (record.uploaded_by && record.uploaded_by !== record.patient_id));
        return matchesSearch && matchesCategory && matchesSource;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
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

                {/* CLINICAL SUMMARY GRID */}
                <h3 className="section-title-premium mt-5 mb-4 px-2">Medical Summary</h3>
                <div className="structured-medical-grid px-2">
                    {/* Allergies Card */}
                    <div className="structured-card-premium allergies-card">
                      <div className="card-premium-header">
                        <div className="header-text">
                          <h3>Severe Allergies</h3>
                          <p>{allergies.filter(a => a.severity === 'severe').length} Severe / {allergies.length} Total</p>
                        </div>
                        <button className="card-action-btn-prm" onClick={() => setAllergyFormOpen(true)}>
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="structured-list-premium custom-scrollbar">
                        {allergies.length === 0 ? (
                          <div className="structured-empty-prm">
                            <p>No severe allergies documented.</p>
                          </div>
                        ) : (
                          allergies.map((item) => (
                            <div key={item.id} className="structured-item-premium">
                              <div className="item-premium-body">
                                <div className="item-premium-main">
                                  <p className="item-title-prm">{item.allergy_name}</p>
                                  <span className={`pill-badge-tiny prm-severity-${item.severity || 'mild'}`}>
                                    {item.severity}
                                  </span>
                                </div>
                                <div className="item-premium-meta-grid">
                                   <div className="meta-cell">
                                     <span className="meta-label">Reaction</span>
                                     <span className="meta-value">{item.reaction || 'N/A'}</span>
                                   </div>
                                   <div className="meta-cell">
                                     <span className="meta-label">Diagnosed</span>
                                     <span className="meta-value">{formatDate(item.diagnosed_date)}</span>
                                   </div>
                                </div>
                              </div>
                              <div className="item-premium-actions">
                                <button onClick={() => medicalRecordService.deleteAllergy(item.id, patientId).then(fetchRecords)} className="btn-icon-tiny">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Conditions Card */}
                    <div className="structured-card-premium conditions-card">
                      <div className="card-premium-header">
                        <div className="header-text">
                          <h3>Active Conditions</h3>
                          <p>{conditions.filter(c => c.status === 'active').length} Active / {conditions.length} Total</p>
                        </div>
                        <button className="card-action-btn-prm" onClick={() => setConditionFormOpen(true)}>
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="structured-list-premium custom-scrollbar">
                        {conditions.length === 0 ? (
                          <div className="structured-empty-prm">
                            <p>No active conditions documented.</p>
                          </div>
                        ) : (
                          conditions.map((item) => (
                            <div key={item.id} className="structured-item-premium">
                              <div className="item-premium-body">
                                <div className="item-premium-main">
                                  <p className="item-title-prm">{item.condition_name}</p>
                                  {item.under_treatment && (
                                    <span className="pill-badge-tiny prm-status-active">Treating</span>
                                  )}
                                </div>
                                <div className="item-premium-meta-grid">
                                   <div className="meta-cell">
                                     <span className="meta-label">Diagnosed</span>
                                     <span className="meta-value">{formatDate(item.diagnosed_date)}</span>
                                   </div>
                                   <div className="meta-cell">
                                     <span className="meta-label">Last Review</span>
                                     <span className="meta-value">{formatDate(item.last_reviewed)}</span>
                                   </div>
                                </div>
                              </div>
                              <div className="item-premium-actions">
                                <button onClick={() => medicalRecordService.deleteCondition(item.id, patientId).then(fetchRecords)} className="btn-icon-tiny">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Medications Card */}
                    <div className="structured-card-premium medications-card">
                      <div className="card-premium-header">
                        <div className="header-text">
                          <h3>Medications</h3>
                          <p>{medications.filter(m => m.status === 'active').length} Active • {medications.filter(m => m.status !== 'active').length} Past</p>
                        </div>
                        <button className="card-action-btn-prm" onClick={() => setMedicationFormOpen(true)}>
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="structured-list-premium custom-scrollbar">
                        {medications.length === 0 ? (
                          <div className="structured-empty-prm">
                            <p>No medications recorded.</p>
                          </div>
                        ) : (
                          medications.map((item) => (
                            <div key={item.id} className="structured-item-premium">
                              <div className="item-premium-body">
                                <div className="item-premium-main">
                                  <p className="item-title-prm">{item.drug_name}</p>
                                  <div className="item-premium-badges">
                                    <span className={`pill-badge-tiny ${item.created_by_role === "doctor" ? "prm-source-doc" : "prm-source-past"}`}>
                                        {item.created_by_role === "doctor" ? "Doctor Prescription" : "Patient Entered"}
                                    </span>
                                  </div>
                                </div>
                                <div className="item-premium-meta-grid">
                                  <div className="meta-cell">
                                    <span className="meta-label">Dose</span>
                                    <span className="meta-value">{item.dosage || "N/A"}</span>
                                  </div>
                                  <div className="meta-cell">
                                    <span className="meta-label">Frequency</span>
                                    <span className="meta-value">{item.frequency || "N/A"}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="item-premium-actions">
                                 <button onClick={() => medicalRecordService.deleteMedication(item.id, patientId).then(fetchRecords)} className="btn-icon-tiny">
                                   <X size={14} />
                                 </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                </div>


                {/* MEDICAL RECORDS ARCHIVE */}
                <div className="medical-archive-section-premium mt-6 px-2 pb-5">
                    <div className="archive-header-prm">
                      <div className="archive-title-stack">
                        <h2 className="fw-black text-dark" style={{fontSize: '2rem'}}>Medical Records</h2>
                        <p className="archive-subtitle">Secure longitudinal patient documentation and diagnostic reports</p>
                      </div>
                      <button className="upload-btn-premium" onClick={() => setIsUploadOpen(true)}>
                        <Plus size={18} />
                        <span>Upload Record</span>
                      </button>
                    </div>

                    <div className="archive-vault-card">
                      <div className="vault-filter-toolbar">
                        <RecordFilters
                          searchTerm={searchTerm}
                          setSearchTerm={setSearchTerm}
                          categoryFilter={categoryFilter}
                          setCategoryFilter={setCategoryFilter}
                          sourceFilter={sourceFilter}
                          setSourceFilter={setSourceFilter}
                        />
                      </div>

                      <div className="vault-table-wrapper">
                          <MedicalRecordTable
                            records={filteredRecords}
                            onView={viewRecord}
                            onDelete={(record) => { setRecordToDelete(record); setIsDeleteOpen(true); }}
                            onDownload={downloadRecord}
                            loading={recordsLoading}
                            isDoctorView={true}
                          />
                      </div>
                    </div>
                </div>


            </div>

            {/* Simple Medical Modals */}
            {allergyFormOpen && (
                <SimpleMedicalModal title="Add Severe Allergy" onClose={() => setAllergyFormOpen(false)} onSave={addAllergy}>
                    <div className="d-flex flex-column gap-3">
                        <input className="form-control" value={allergyForm.allergy_name} onChange={e => setAllergyForm({...allergyForm, allergy_name: e.target.value})} placeholder="Allergy Name" />
                        <select className="form-select" value={allergyForm.reaction} onChange={e => setAllergyForm({...allergyForm, reaction: e.target.value})}>
                            {ALLERGY_REACTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select className="form-select" value={allergyForm.severity} onChange={e => setAllergyForm({...allergyForm, severity: e.target.value})}>
                            <option value="Mild">Mild</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                        </select>
                    </div>
                </SimpleMedicalModal>
            )}

            {conditionFormOpen && (
                <SimpleMedicalModal title="Add Active Condition" onClose={() => setConditionFormOpen(false)} onSave={addCondition}>
                    <div className="d-flex flex-column gap-3">
                        <input className="form-control" value={conditionForm.condition_name} onChange={e => setConditionForm({...conditionForm, condition_name: e.target.value})} placeholder="Condition Name" />
                        <input className="form-control" type="date" value={conditionForm.diagnosed_date} onChange={e => setConditionForm({...conditionForm, diagnosed_date: e.target.value})} label="Diagnosed Date" />
                        <label className="d-flex align-items-center gap-2">
                            <input type="checkbox" checked={conditionForm.under_treatment} onChange={e => setConditionForm({...conditionForm, under_treatment: e.target.checked})} /> Under Treatment
                        </label>
                    </div>
                </SimpleMedicalModal>
            )}

            {medicationFormOpen && (
                <SimpleMedicalModal title="Add Medication" onClose={() => setMedicationFormOpen(false)} onSave={addMedication}>
                    <div className="d-flex flex-column gap-3">
                        <input className="form-control" value={medicationForm.drug_name} onChange={e => setMedicationForm({...medicationForm, drug_name: e.target.value})} placeholder="Drug Name" />
                        <input className="form-control" value={medicationForm.dosage} onChange={e => setMedicationForm({...medicationForm, dosage: e.target.value})} placeholder="Dosage (e.g. 500mg)" />
                        <input className="form-control" value={medicationForm.frequency} onChange={e => setMedicationForm({...medicationForm, frequency: e.target.value})} placeholder="Frequency (e.g. 1-0-1)" />
                    </div>
                </SimpleMedicalModal>
            )}

            <UploadMedicalRecordModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUpload={handleUpload}
                defaultDoctorName={identity.full_name || ''}
                defaultHospitalName="NeuroNest Clinic"
            />
            <DeleteConfirmationModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                record={recordToDelete}
            />
            <ViewMedicalRecordModal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                record={recordToView}
            />
        </div>
    );
};

const SimpleMedicalModal = ({ title, children, onClose, onSave }) => (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header border-bottom-0 p-4 pb-0 d-flex justify-content-between align-items-center">
            <h5 className="modal-title fw-black">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            {children}
          </div>
          <div className="modal-footer border-top-0 p-4 pt-0">
            <button className="btn btn-light rounded-pill px-4" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={onSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
);

export default PatientRecords;

