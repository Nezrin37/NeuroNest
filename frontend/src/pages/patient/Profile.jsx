import { useState, useEffect } from "react";
import api from "../../api/axios";
import axios from "axios";
import { toAssetUrl } from "../../utils/media";
import "../../styles/ProfileStyles.css"; 
import "../../styles/patient-records.css"; // Reuse premium clinical styles
import { getClinicalSummary } from "../../api/profileApi";
import { 
  User, Phone, Mail, MapPin, Activity, 
  Heart, Calendar, Ruler, Weight, Edit2, 
  Save, X, Plus, Trash2, ShieldAlert,
  CalendarDays, History, ArrowRight, Clock,
  Droplet, Moon, Scale, Utensils, Hash, Pill
} from "lucide-react";

const PROFILE_KEYS = [
  "full_name",
  "phone",
  "date_of_birth",
  "gender",
  "blood_group",
  "height_cm",
  "weight_kg",
  "address",
  "city",
  "state",
  "country",
  "pincode",
  "allergies",
  "chronic_conditions",
  "profile_image",
];

const normalizeProfile = (data = {}) =>
  PROFILE_KEYS.reduce((acc, key) => {
    acc[key] = data[key] ?? "";
    return acc;
  }, {});

const normalizeEmergencyContacts = (contacts = []) =>
  (contacts || []).map((contact) => ({
    contact_name: contact.contact_name ?? "",
    relationship: contact.relationship ?? "",
    phone: contact.phone ?? "",
    alternate_phone: contact.alternate_phone ?? "",
    email: contact.email ?? "",
    is_primary: Boolean(contact.is_primary),
  }));

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [_CITIES, setCities] = useState([]);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialProfileSnapshot, setInitialProfileSnapshot] = useState(null);
  const [initialEmergencySnapshot, setInitialEmergencySnapshot] = useState(null);

  const fetchClinicalData = async () => {
    try {
      const data = await getClinicalSummary();
      setClinicalData(data);
      const cleanedProfile = normalizeProfile(data.identity);
      setProfile(cleanedProfile);
      localStorage.setItem("userProfile", JSON.stringify(cleanedProfile));
    } catch (err) {
      console.error("Failed to fetch clinical summary", err);
    }
  };

  const fetchEmergencyContact = async () => {
    try {
      const res = await api.get("/profile/emergency-contact/me");
      if (Array.isArray(res.data)) {
        const normalizedContacts = normalizeEmergencyContacts(res.data);
        setEmergencyContacts(normalizedContacts);
      }
    } catch {
      console.log("No emergency contacts found");
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await axios.get("https://countriesnow.space/api/v0.1/countries/positions");
      const list = res.data.data.map((c) => c.name);
      setCountries(list);
    } catch (err) { console.error(err); }
  };

  const fetchStates = async (country) => {
    try {
      const res = await axios.post("https://countriesnow.space/api/v0.1/countries/states", { country });
      setStates(res.data.data.states.map((s) => s.name));
    } catch { setStates([]); }
  };

  const fetchCities = async (country, state) => {
    try {
      const res = await axios.post("https://countriesnow.space/api/v0.1/countries/state/cities", { country, state });
      setCities(res.data.data);
    } catch { setCities([]); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClinicalData(), fetchEmergencyContact(), fetchCountries()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    if (name === "country") {
      setProfile((prev) => ({ ...prev, country: value, state: "", city: "", pincode: "" }));
      await fetchStates(value);
      return;
    }
    if (name === "state") {
      setProfile((prev) => ({ ...prev, state: value, city: "" }));
      await fetchCities(profile.country, value);
      return;
    }
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleEmergencyChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedContacts = [...emergencyContacts];
    if (name === "is_primary" && checked) {
        updatedContacts.forEach(c => c.is_primary = false);
    }
    updatedContacts[index][name] = type === "checkbox" ? checked : value;
    setEmergencyContacts(updatedContacts);
  };

  const addNewContact = () => setEmergencyContacts([...emergencyContacts, { contact_name: "", relationship: "", phone: "", alternate_phone: "", email: "", is_primary: false }]);
  const removeContact = (index) => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));

  const startEditing = () => {
    setInitialProfileSnapshot(normalizeProfile(profile));
    setInitialEmergencySnapshot(normalizeEmergencyContacts(emergencyContacts));
    setEditing(true);
  };

  const cancelEdit = () => {
    setProfile(initialProfileSnapshot);
    setEmergencyContacts(initialEmergencySnapshot);
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      Object.keys(profile).forEach((key) => { formData.append(key, profile[key] ?? ""); });
      if (profileImage) formData.append("profile_image", profileImage);

      await api.put("/profile/me", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await api.put("/profile/emergency-contact/me", emergencyContacts);

      // Force local storage to reflect new name synchronously
      const userStr = localStorage.getItem('neuronest_user');
      if (userStr && profile.full_name) {
          try {
              const parsedUser = JSON.parse(userStr);
              parsedUser.full_name = profile.full_name;
              localStorage.setItem('neuronest_user', JSON.stringify(parsedUser));
          } catch {
              // Ignore malformed local cache and proceed.
          }
      }

      setEditing(false);
      fetchClinicalData();
      
      // Reload page briefly to refresh global UI context (navbar, layout, etc.)
      setTimeout(() => {
          window.location.reload();
      }, 500);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  if (loading || !profile) return <div className="loading-spinner">Loading Profile...</div>;

  const calculateAge = (dobString) => {
    if (!dobString || dobString === "N/A") return "N/A";
    const now = new Date();
    const birthDate = new Date(dobString);
    const difference = now.getTime() - birthDate.getTime();
    return Math.abs(new Date(difference).getUTCFullYear() - 1970);
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return "N/A";
    const heightMeters = height / 100;
    return (weight / (heightMeters * heightMeters)).toFixed(1);
  };

  const age = calculateAge(profile.date_of_birth);
  const bmi = calculateBMI(profile.weight_kg, profile.height_cm);

  return (
    <div className="patient-profile-page-wrapper">
      <div className="background-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="profile-container py-4 px-3 px-md-5">
        <div className="d-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 fw-black text-dark mb-0">My Health Profile</h1>
            {!editing ? (
                <button onClick={startEditing} className="btn btn-dark rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2">
                    <Edit2 size={18} /> Edit Profile
                </button>
            ) : (
                <div className="d-flex gap-2">
                    <button onClick={cancelEdit} className="btn btn-light rounded-pill px-4 fw-bold shadow-sm">Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2">
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            )}
        </div>

        {!editing ? (
            <div className="mx-auto" style={{ maxWidth: '1440px' }}>
                {/* MATERIALLY MATCHED IDENTITY CARD */}
                <div className="card clinical-panel mb-4 border-0">
                    <div className="d-flex flex-wrap flex-lg-nowrap gap-4">
                        {/* Avatar Col */}
                        <div className="d-flex flex-column align-items-center gap-3 pe-lg-3">
                            <div className="patient-img-large overflow-hidden">
                                {profile.profile_image ? (
                                    <img src={toAssetUrl(profile.profile_image)} alt={profile.full_name} className="w-100 h-100 object-fit-cover" />
                                ) : (
                                    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary"><User size={64} /></div>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <div className="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 d-flex align-items-center fw-bold" style={{fontSize: '0.65rem', padding: '0.4rem 0.8rem'}}><span className="me-1">🚫</span> Alcohol</div>
                                <div className="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 d-flex align-items-center fw-bold" style={{fontSize: '0.65rem', padding: '0.4rem 0.8rem'}}><span className="me-1">🚬</span> Smoker</div>
                            </div>
                        </div>

                        {/* Details Col */}
                        <div className="flex-grow-1 d-flex flex-column justify-content-between gap-4">
                            {/* Top row */}
                            <div className="d-flex justify-content-between align-items-start w-100">
                                <div>
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <h2 className="fw-black text-dark mb-0" style={{fontSize: '1.4rem'}}>{profile.full_name}</h2>
                                        <div className="d-flex gap-2">
                                            <button className="btn btn-light btn-sm rounded-circle p-2 shadow-sm border border-light d-flex align-items-center justify-content-center"><Phone size={14} className="text-secondary"/></button>
                                            <button className="btn btn-light btn-sm rounded-circle p-2 shadow-sm border border-light d-flex align-items-center justify-content-center"><Mail size={14} className="text-secondary"/></button>
                                        </div>
                                    </div>
                                    <div className="d-flex flex-wrap gap-4 text-dark fw-bold" style={{fontSize: '0.8rem'}}>
                                        <span className="d-flex align-items-center gap-2"><User size={14} className="text-secondary"/> {profile.gender || 'Not Specified'}</span>
                                        <span className="d-flex align-items-center gap-2"><MapPin size={14} className="text-secondary"/> {profile.city || 'Elshiekh zayed, Giza'}</span>
                                        <span className="d-flex align-items-center gap-2"><Calendar size={14} className="text-secondary"/> {profile.date_of_birth} ({age} years)</span>
                                        <span className="d-flex align-items-center gap-2"><Phone size={14} className="text-secondary"/> {profile.phone}</span>
                                    </div>
                                </div>
                                <button onClick={startEditing} className="btn btn-white border border-light rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 text-dark">
                                    <Edit2 size={14} /> Edit
                                </button>
                            </div>

                            {/* Bottom row: Vitals + Tags */}
                            <div className="d-flex flex-wrap flex-xl-nowrap justify-content-between align-items-center gap-4">
                                {/* Vitals Box */}
                                <div className="d-flex align-items-center p-3 px-4 rounded-4" style={{border: '1.5px dashed #e2e8f0', gap: '30px', backgroundColor: '#ffffff'}}>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>{bmi}</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            BMI <span className="text-success ms-1">▼ 10</span>
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>{profile.weight_kg || 'N/A'}</span>
                                            <span className="fw-bold text-muted" style={{fontSize: '0.75rem'}}>kg</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Weight
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>{profile.height_cm || 'N/A'}</span>
                                            <span className="fw-bold text-muted" style={{fontSize: '0.75rem'}}>Cm</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Height
                                        </div>
                                    </div>
                                    <div style={{width: '1px', height: '36px', backgroundColor: '#e2e8f0'}}></div>
                                    <div className="text-center">
                                        <div className="d-flex align-items-baseline justify-content-center gap-1">
                                            <span className="fw-black text-dark lh-1" style={{fontSize: '1.25rem'}}>{profile.blood_group || 'N/A'}</span>
                                        </div>
                                        <div className="text-muted fw-bold mt-1 d-flex align-items-center justify-content-center gap-1" style={{fontSize: '0.65rem'}}>
                                            Blood Type
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="d-flex flex-column align-items-end gap-3 text-end">
                                    <div className="d-flex flex-column align-items-end gap-1">
                                        <span className="text-dark fw-bolder mb-1" style={{fontSize: '0.75rem'}}>Own diagnosis</span>
                                        <div className="d-flex gap-2">
                                            {(clinicalData?.conditions || []).filter(c => c.status === 'active').slice(0, 2).map((c, i) =>(
                                               <span key={i} className={`badge bg-${i === 0 ? 'warning' : 'primary'} bg-opacity-10 text-${i === 0 ? 'warning' : 'primary'} rounded-pill px-3 py-2 fw-bold`} style={{fontSize: '0.65rem'}}>{c.condition_name}</span>
                                            ))}
                                            {(!clinicalData?.conditions || clinicalData.conditions.length === 0) && <span className="text-muted small">None</span>}
                                        </div>
                                    </div>
                                    <div className="d-flex flex-column align-items-end gap-1">
                                        <span className="text-dark fw-bolder mb-1" style={{fontSize: '0.75rem'}}>Known Allergies</span>
                                        <div className="d-flex gap-2">
                                            {(clinicalData?.allergies || []).slice(0, 2).map((a, i) =>(
                                               <span key={i} className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3 py-2 fw-bold" style={{fontSize: '0.65rem'}}>{a.allergy_name}</span>
                                            ))}
                                            {(!clinicalData?.allergies || clinicalData.allergies.length === 0) && <span className="text-muted small">None</span>}
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
                        <div className="clinical-panel h-100">
                            <div className="panel-header">
                                <div className="panel-title"><Calendar size={18} /> Timeline</div>
                                <button className="panel-edit-btn">Edit</button>
                            </div>
                            <div className="pt-2">
                                {(clinicalData?.timeline || []).slice(0, 5).map((appt, i) => {
                                    const dateObj = new Date(appt.appointment_date);
                                    const month = dateObj.toLocaleString('default', { month: 'short' });
                                    const year = dateObj.getFullYear();
                                    return (
                                    <div key={i} className="timeline-row">
                                        <div className="timeline-left"><span>{month}</span><span>{year}</span></div>
                                        <div className="timeline-center"><div className="timeline-marker" style={i === (clinicalData?.timeline?.length || 0) - 1 ? {borderColor: '#2b70ff'} : {}}></div></div>
                                        <div className="timeline-right">
                                            <div className="timeline-title">{appt.reason || 'General Appt'}</div>
                                            <div className="timeline-subtitle">Dr. {appt.doctor_name || 'Specialist'}</div>
                                        </div>
                                    </div>
                                    );
                                })}
                                {(!clinicalData?.timeline || clinicalData.timeline.length === 0) && <div className="text-muted text-center pt-4 fw-bold">No recent history</div>}
                            </div>
                        </div>
                    </div>

                    {/* EMERGENCY / CONTACT (Replaced Medical History with Emergency logic for Profile page) */}
                    <div className="col-12 col-lg-8">
                        <div className="clinical-panel h-100">
                            <div className="panel-header">
                                <div className="panel-title"><ShieldAlert size={18} /> Emergency Support</div>
                                <button className="panel-edit-btn" onClick={startEditing}>Edit</button>
                            </div>
                            <div className="row g-3">
                                {emergencyContacts.map((c, i) => (
                                    <div key={i} className="col-md-6">
                                        <div className={`med-history-box ${c.is_primary ? 'border border-primary border-opacity-50' : ''}`}>
                                            <div className="med-history-header">
                                                <div className="med-history-icon"><Phone size={14} className={c.is_primary ? 'text-primary' : ''}/></div>
                                                <span className="med-history-title">{c.relationship || 'Emergency Contact'} {c.is_primary && '(Primary)'}</span>
                                            </div>
                                            <div className="med-history-data">{c.contact_name}</div>
                                            <div className="text-muted fw-bold mt-1" style={{fontSize: '0.75rem'}}>{c.phone}</div>
                                            <div className="text-muted fw-bold" style={{fontSize: '0.75rem'}}>{c.email}</div>
                                        </div>
                                    </div>
                                ))}
                                {emergencyContacts.length === 0 && <div className="col-12 text-muted fw-bold">No emergency contacts listed</div>}
                                
                                <div className="col-12 mt-4">
                                    <div className="med-history-box">
                                        <div className="med-history-header">
                                            <div className="med-history-icon"><MapPin size={14} /></div>
                                            <span className="med-history-title">Personal Address</span>
                                        </div>
                                        <div className="med-history-data">{profile.address}</div>
                                        <div className="text-muted fw-bold mt-1" style={{fontSize: '0.75rem'}}>{profile.city}, {profile.state}</div>
                                        <div className="text-muted fw-bold" style={{fontSize: '0.75rem'}}>{profile.country} - {profile.pincode}</div>
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
                        <div className="clinical-panel h-100 p-0 overflow-hidden d-flex flex-column">
                            <div className="panel-header p-4 pb-2 m-0">
                                <div className="panel-title"><Pill size={18} /> Active Medications</div>
                                <button className="panel-edit-btn">Edit</button>
                            </div>
                            <div className="table-responsive px-2 flex-grow-1">
                                <table className="table med-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Dosage</th>
                                            <th>Freq</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(clinicalData?.medications || []).filter(m => m.status === 'active').map((med, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="bg-light rounded p-2 text-primary"><Pill size={18}/></div>
                                                        <div>
                                                            <div className="fw-black text-dark" style={{fontSize: '0.85rem'}}>{med.drug_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{med.dosage}</td>
                                                <td>{med.frequency}</td>
                                                <td><span className="badge rounded-pill bg-success bg-opacity-10 text-success fw-bold p-2 px-3">Active</span></td>
                                            </tr>
                                        ))}
                                        {(!clinicalData?.medications || clinicalData.medications.filter(m => m.status === 'active').length === 0) && <tr><td colSpan="4" className="text-center py-4 fw-bold text-muted">No active medications</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* DIET */}
                    <div className="col-12 col-lg-4">
                        <div className="clinical-panel h-100">
                            <div className="panel-header mb-3">
                                <div className="panel-title"><Activity size={18} /> Conditions Log</div>
                            </div>
                            <div className="d-flex flex-column pt-1">
                                {(clinicalData?.conditions || []).map((c, i) => (
                                    <div key={i} className="diet-list-item justify-content-between">
                                        <div className="d-flex align-items-center gap-2"><Heart size={16} className="text-danger"/> {c.condition_name}</div>
                                        <span className={`badge bg-${c.status === 'active' ? 'danger' : 'secondary'} bg-opacity-10 text-${c.status === 'active' ? 'danger' : 'secondary'} rounded-pill`}>{c.status}</span>
                                    </div>
                                ))}
                                {(clinicalData?.allergies || []).map((a, i) => (
                                    <div key={i + 10} className="diet-list-item justify-content-between">
                                        <div className="d-flex align-items-center gap-2"><ShieldAlert size={16} className="text-warning"/> {a.allergy_name}</div>
                                        <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill">{a.severity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            /* EDIT FORM */
            <div className="edit-form-grid">
                <div className="form-section-title"><User size={20} className="text-primary" /> Basic Information</div>
                <div className="form-group">
                    <label>Full Name</label>
                    <input name="full_name" value={profile.full_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Profile Picture</label>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="date_of_birth" value={profile.date_of_birth} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Gender</label>
                    <select name="gender" value={profile.gender} onChange={handleChange}>
                        <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Blood Group</label>
                    <select name="blood_group" value={profile.blood_group} onChange={handleChange}>
                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" name="height_cm" value={profile.height_cm} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight_kg" value={profile.weight_kg} onChange={handleChange} />
                </div>

                <div className="form-section-title mt-4"><MapPin size={20} className="text-primary" /> Contact Details</div>
                <div className="form-group full-width"><label>Full Address</label><input name="address" value={profile.address} onChange={handleChange} /></div>
                <div className="form-group">
                    <label>Country</label>
                    <select name="country" value={profile.country} onChange={handleChange}>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>State</label>
                    <select name="state" value={profile.state} onChange={handleChange}>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>City</label>
                    <input name="city" value={profile.city} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Pincode</label>
                    <input name="pincode" value={profile.pincode} onChange={handleChange} />
                </div>

                <div className="form-section-title mt-4"><ShieldAlert size={20} className="text-danger" /> Emergency Contacts</div>
                <div className="full-width">
                     {emergencyContacts.map((contact, index) => (
                         <div key={index} className="emergency-edit-card mb-3 p-3 border rounded-3 bg-light">
                             <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="fw-bold">Contact #{index + 1}</span>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => removeContact(index)}><Trash2 size={16}/></button>
                             </div>
                             <div className="row g-3">
                                 <div className="col-md-6"><label className="small fw-bold">Name</label><input name="contact_name" value={contact.contact_name} onChange={(e) => handleEmergencyChange(index, e)} className="form-control" /></div>
                                 <div className="col-md-6"><label className="small fw-bold">Relationship</label><input name="relationship" value={contact.relationship} onChange={(e) => handleEmergencyChange(index, e)} className="form-control" /></div>
                                 <div className="col-md-6"><label className="small fw-bold">Phone</label><input name="phone" value={contact.phone} onChange={(e) => handleEmergencyChange(index, e)} className="form-control" /></div>
                                 <div className="col-md-6"><label className="small fw-bold">Email</label><input name="email" value={contact.email} onChange={(e) => handleEmergencyChange(index, e)} className="form-control" /></div>
                             </div>
                         </div>
                     ))}
                     <button className="btn btn-outline-primary w-100 mt-2" onClick={addNewContact}><Plus size={16}/> Add New Contact</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
