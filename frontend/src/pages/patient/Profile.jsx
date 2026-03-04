import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import axios from "axios";
import { toAssetUrl } from "../../utils/media";
import "../../styles/ProfileStyles.css"; 
import "../../styles/patient-records.css"; // Reuse premium clinical styles
import { useNavigate } from "react-router-dom";
import { getClinicalSummary } from "../../api/profileApi";
import { 
  User, Phone, Mail, MapPin, Activity, 
  Heart, Calendar, Ruler, Weight, Edit2, 
  Save, X, Plus, Trash2, ShieldAlert,
  CalendarDays, History, ArrowRight, Clock,
  Droplet, Moon, Scale, Utensils, Hash
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

const normalizeText = (value = "") => value.toString().trim().toLowerCase();

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageName, setProfileImageName] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const navigate = useNavigate();

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
      setProfileImageName(e.target.files[0].name);
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

      setEditing(false);
      fetchClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  if (loading || !profile) return <div className="loading-spinner">Loading Profile...</div>;

  const calculateAge = (dobString) => {
    if (!dobString || dobString === "N/A") return "N/A";
    const birthDate = new Date(dobString);
    const difference = Date.now() - birthDate.getTime();
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
    <>
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
            <div className="profile-view-wrapper">
                {/* IDENTITY BANNER CARD */}
                <div className="profile-card-top mb-5">
                    <div className="row align-items-center g-5">
                        <div className="col-12 col-md-auto text-center">
                            <div className="position-relative d-inline-block">
                                {profile.profile_image ? (
                                    <img src={toAssetUrl(profile.profile_image)} alt={profile.full_name} className="patient-avatar-large shadow-lg" />
                                ) : (
                                    <div className="patient-avatar-large d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary display-4 fw-bold shadow-sm">
                                        {profile.full_name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-12 col-md">
                            <h2 className="h2 fw-black text-dark mb-3 m-0" style={{ letterSpacing: '-0.03em' }}>{profile.full_name}</h2>
                            <div className="d-flex flex-wrap gap-4 text-secondary mb-4 fw-bold" style={{ fontSize: '0.85rem' }}>
                                <div className="d-flex align-items-center gap-2"><User size={16} /> {profile.gender}</div>
                                <div className="d-flex align-items-center gap-2"><Calendar size={16} /> {profile.date_of_birth} ({age} years)</div>
                                <div className="d-flex align-items-center gap-2"><Mail size={16} /> {profile.phone}</div>
                            </div>

                            <div className="vitals-grid">
                                <div className="vital-item">
                                    <div className="vital-label">Current BMI</div>
                                    <div className="vital-value text-primary">{bmi} <span className="vital-unit">points</span></div>
                                </div>
                                <div className="vital-item">
                                    <div className="vital-label">Recent Weight</div>
                                    <div className="vital-value">{profile.weight_kg || 'N/A'} <span className="vital-unit">kg</span></div>
                                </div>
                                <div className="vital-item">
                                    <div className="vital-label">Height</div>
                                    <div className="vital-value">{profile.height_cm || 'N/A'} <span className="vital-unit">cm</span></div>
                                </div>
                                <div className="vital-item">
                                    <div className="vital-label">Blood Type</div>
                                    <div className="vital-value text-danger">{profile.blood_group} <Droplet size={18} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM GRIDS */}
                <div className="row g-5">
                    {/* LEFT: Timeline */}
                    <div className="col-12 col-xl-4">
                        <div className="section-title"><Clock size={18} className="text-primary" /> Recent Appointments</div>
                        <div className="timeline-vertical">
                            {clinicalData?.timeline?.length > 0 ? clinicalData.timeline.map((appt, i) => (
                                <div key={i} className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-date">{appt.appointment_date}</div>
                                    <div className="timeline-content">
                                        <div className="fw-bold text-dark">{appt.reason}</div>
                                        <div className="text-secondary small">Dr. {appt.doctor_name || 'Medical Specialist'}</div>
                                    </div>
                                </div>
                            )) : <div className="text-muted fw-bold p-3">No recent appointments</div>}
                        </div>
                    </div>

                    {/* CENTER: Clinical Summary */}
                    <div className="col-12 col-xl-5">
                        <div className="section-title"><Activity size={18} className="text-primary" /> Medical History</div>
                        <div className="clinical-history-card">
                            <div className="row g-4">
                                <div className="col-12 col-md-6 mb-4">
                                    <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Active Conditions</div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {clinicalData?.conditions?.length > 0 ? clinicalData.conditions.map((c, i) => (
                                            <span key={i} className="badge-condition">{c.condition_name}</span>
                                        )) : <span className="text-muted fw-bold">No active conditions</span>}
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: '0.65rem' }}>Known Allergies</div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {clinicalData?.allergies?.length > 0 ? clinicalData.allergies.map((a, i) => (
                                            <span key={i} className="badge-barrier">{a.allergy_name}</span>
                                        )) : <span className="text-muted fw-bold">No known allergies</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="section-title mt-5"><Scale size={18} className="text-primary" /> Active Medications</div>
                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                            <table className="table medication-table mb-0">
                                <thead>
                                    <tr><th>Medication</th><th>Dosage</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {clinicalData?.medications?.length > 0 ? clinicalData.medications.map((m, i) => (
                                        <tr key={i}>
                                            <td className="fw-bold">{m.drug_name}</td>
                                            <td className="text-secondary">{m.dosage}</td>
                                            <td><span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Active</span></td>
                                        </tr>
                                    )) : <tr><td colSpan="3" className="text-center py-4 text-muted">No active medications</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT: Contact & Emergency */}
                    <div className="col-12 col-xl-3">
                        <div className="section-title"><ShieldAlert size={18} className="text-danger" /> Emergency Support</div>
                        {emergencyContacts.map((c, i) => (
                            <div key={i} className={`diet-item p-3 mb-3 ${c.is_primary ? 'border-primary' : ''}`}>
                                <div className="diet-icon bg-danger bg-opacity-10 text-danger"><Phone size={16} /></div>
                                <div>
                                    <div className="diet-text">{c.contact_name}</div>
                                    <div className="text-secondary small fw-bold">{c.relationship} • {c.phone}</div>
                                </div>
                            </div>
                        ))}
                        <div className="section-title mt-5"><MapPin size={18} className="text-primary" /> Personal Address</div>
                        <div className="info-card p-3 border-0 bg-light bg-opacity-50">
                            <div className="text-secondary small fw-bold mb-2">{profile.address}</div>
                            <div className="text-dark fw-bold">{profile.city}, {profile.state}</div>
                            <div className="text-secondary small">{profile.country} - {profile.pincode}</div>
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
    </>
  );
};

export default Profile;
