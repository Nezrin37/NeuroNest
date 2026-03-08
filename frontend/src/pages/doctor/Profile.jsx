import React, { useEffect, useState, useRef } from 'react';
import { getDoctorProfile, updateDoctorProfile, uploadProfileImage, addExperience, deleteExperience } from '../../services/doctorProfileService';
import { 
  Camera, Briefcase, FileText, Phone, Award, Shield, DollarSign, Hospital, Globe, Clock, Settings, ArrowRight, User, Trash2, Plus
} from 'lucide-react';
import ExpertiseTags from '../../components/doctor/ExpertiseTags';
import AvailabilityModal from '../../components/doctor/AvailabilityModal';
import { fetchSpecialties } from '../../services/adminDoctorAPI';
import { toAssetUrl } from '../../utils/media';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/profile-dark.css';

const Profile = () => {
    const { isDark } = useTheme();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Core state
    const [isEditing, setIsEditing] = useState(false);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [specialties, setSpecialties] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isExperienceLoading, setIsExperienceLoading] = useState(false);
    const [newExp, setNewExp] = useState({
        title: '',
        hospital: '',
        startYear: new Date().getFullYear().toString(),
        endYear: 'Present',
        description: ''
    });

    useEffect(() => {
        fetchProfile();
        loadSpecialties();
    }, []);

    const loadSpecialties = async () => {
        try {
            const data = await fetchSpecialties();
            setSpecialties(data.specialties || []);
        } catch (err) {
            console.error('Failed to load specialties', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const data = await getDoctorProfile();
            setProfile(data);
            setFormData(data); 
        } catch (err) {
            setError('Failed to load profile.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const updatedProfile = await updateDoctorProfile(formData);
            setProfile(updatedProfile);
            setFormData(updatedProfile);
            setIsEditing(false);
            alert("Profile updated successfully!"); 
        } catch (err) {
            console.error("Failed to update profile", err);
            alert("Failed to update profile. Please try again.");
        }
    };

    const cancelEdit = () => {
        setFormData(profile); 
        setIsEditing(false);
    };

    // --- Image Upload Handler ---
    const handleImageClick = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const response = await uploadProfileImage(file); 
            if (response.image_url) {
                setProfile(prev => ({ ...prev, profile_image: response.image_url }));
                setFormData(prev => ({ ...prev, profile_image: response.image_url }));
                alert("Profile photo updated!");
            }
        } catch (error) {
            console.error("Image upload failed", error);
            alert("Failed to upload image.");
        }
    };

    // --- Tag Handlers ---
    const handleAddTag = (newTag) => {
        if (!formData.expertise_tags) return;
        const exists = formData.expertise_tags.some(t => (typeof t === 'string' ? t : t.tag_name) === newTag);
        if (exists) return;
        setFormData(prev => ({
            ...prev,
            expertise_tags: [...(prev.expertise_tags || []), { tag_name: newTag }]
        }));
    };

    // --- Experience Handlers ---
    const handleAddExp = async () => {
        if (!newExp.title || !newExp.hospital || !newExp.startYear || !newExp.endYear) {
            alert("Title, Hospital/Clinic, and Time Range are required.");
            return;
        }
        setIsExperienceLoading(true);
        try {
            const period = `${newExp.startYear} - ${newExp.endYear}`;
            const experienceToAdd = {
                title: newExp.title,
                hospital: newExp.hospital,
                period: period,
                description: newExp.description
            };
            const updatedProfile = await addExperience(experienceToAdd);
            setProfile(updatedProfile);
            setFormData(updatedProfile);
            setNewExp({ 
                title: '', 
                hospital: '', 
                startYear: new Date().getFullYear().toString(), 
                endYear: 'Present', 
                description: '' 
            });
        } catch (err) {
            console.error("Failed to add experience", err);
            alert("Failed to add experience.");
        } finally {
            setIsExperienceLoading(false);
        }
    };

    const handleDeleteExp = async (expId) => {
        if (!window.confirm("Delete this experience record?")) return;
        try {
            const updatedProfile = await deleteExperience(expId);
            setProfile(updatedProfile);
            setFormData(updatedProfile);
        } catch (err) {
            console.error("Failed to delete experience", err);
            alert("Failed to delete experience.");
        }
    };

    // --- Availability Update Handler ---
    const handleAvailabilityUpdate = (updatedProfile) => {
        setProfile(updatedProfile);
        setFormData(updatedProfile);
    };

    if (loading) return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-black">
            <div className="spinner-border text-light border-3" role="status"></div>
        </div>
    );
    if (error) return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 text-danger fw-medium bg-black">
            Error: {error}
        </div>
    );
    if (!profile) return null;

    return (
        <div className={`dark-profile-page ${!isDark ? 'light-theme' : ''}`}>
            <div className="dark-container">
                <div className="dark-banner p-4">
                    {!isEditing && (
                        <button 
                            className="dark-btn-secondary ms-auto d-flex align-items-center gap-2" 
                            style={{marginTop: 0, width: 'auto'}} 
                            onClick={() => setIsEditing(true)}
                        >
                            <Settings size={14}/> Edit Profile
                        </button>
                    )}
                </div>
                
                <div className="dark-content-row">
                    {/* LEFT SIDEBAR */}
                    <div className="dark-sidebar">
                        <div className="dark-profile-img-wrap" onClick={handleImageClick}>
                            <img src={toAssetUrl(formData.profile_image) || "https://via.placeholder.com/300"} alt="Avatar" />
                            <span className="dark-verified-badge">&#10003;</span>
                            {isEditing && (
                                <div className="editing-overlay">
                                    <Camera color="var(--nn-surface)" size={24} />
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                        </div>
                        
                        <h2 className="dark-username">{formData.full_name || "Dr. Name"}</h2>
                        <h3 className="dark-usertitle">{formData.specialization || "Clinical Specialist"}</h3>

                        <div className="dark-section-title mt-2">Skills and Expertise</div>
                        <div className="dark-tags">
                            {formData.expertise_tags?.length > 0 ? (
                                formData.expertise_tags.map((tag, idx) => (
                                    <span key={idx} className="dark-tag filled">
                                        {typeof tag === 'string' ? tag : tag.tag_name}
                                    </span>
                                ))
                            ) : (
                                <span className="dark-tag">#medical</span>
                            )}
                            {isEditing && (
                                <button className="dark-tag" style={{ borderStyle: 'dashed', cursor: 'pointer' }} onClick={() => {
                                    const tag = prompt("Enter new skill tag:");
                                    if(tag) handleAddTag(tag);
                                }}>+ Add</button>
                            )}
                        </div>

                        <div className="dark-section-title mt-2">Contact & Info</div>
                        <div className="dark-sidebar-list">
                            <div className="dark-sidebar-item">
                                <div className="dark-sidebar-icon"><Phone size={14} color="var(--nn-online-consult)"/></div>
                                <div className="dark-sidebar-text">
                                    <span className="title">{formData.phone || "Not provided"}</span>
                                    <span className="subtitle">Phone Number</span>
                                </div>
                            </div>
                            <div className="dark-sidebar-item">
                                <div className="dark-sidebar-icon"><Hospital size={14} color="var(--nn-online-consult)"/></div>
                                <div className="dark-sidebar-text">
                                    <span className="title">{formData.hospital_name || "Independent"}</span>
                                    <span className="subtitle">Facility / Network</span>
                                </div>
                            </div>
                            <div className="dark-sidebar-item">
                                <div className="dark-sidebar-icon"><Globe size={14} color="var(--nn-online-consult)"/></div>
                                <div className="dark-sidebar-text">
                                    <span className="title">{formData.consultation_mode === 'Both' ? 'Online and Offline Consultation' : (formData.consultation_mode || "Mixed")}</span>
                                    <span className="subtitle">Modality</span>
                                </div>
                            </div>
                        </div>

                        {/* Removed About Career from here to expand timeline */}
                    </div>

                    {/* MAIN RIGHT COLUMN */}
                    <div className="dark-main-content">
                        
                        <div className="dark-tabs d-flex flex-wrap">
                            <button className={`dark-tab ${activeTab === 'overview' ? 'dark-tab-box' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                            <button className="dark-btn-primary d-flex align-items-center gap-2 shadow-sm" style={{ marginLeft: 'auto', padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => setIsAvailabilityModalOpen(true)}>
                                <Clock size={16} /> Scheduling
                            </button>
                        </div>

                        {/* VIEW MODE */}
                        {!isEditing && activeTab === 'overview' && (
                            <div className="dark-card-grid">
                                {/* Card 1: Senior credentials */}
                                <div className="dark-card">
                                    <div className="dark-card-header">
                                        <div className="dark-card-icon"><Briefcase size={20} color="var(--nn-primary)"/></div>
                                        <div className="dark-card-title-wrap">
                                            <span className="dark-card-title">Professional Background</span>
                                            <span className="dark-card-sub">Clinical Roles</span>
                                        </div>
                                    </div>

                                    <div className="dark-card-pills">
                                        <span className="dark-card-pill">{formData.qualification || "Degree"}</span>
                                        <span className="dark-card-pill">Min. {formData.experience_years || 0} Years</span>
                                        <span className="dark-card-pill">{formData.department || "Medical"}</span>
                                    </div>
                                </div>

                                {/* Card 2: Regulatory Identity */}
                                <div className="dark-card">
                                    <div className="dark-card-header">
                                        <div className="dark-card-icon"><Shield size={20} color="var(--nn-primary)"/></div>
                                        <div className="dark-card-title-wrap">
                                            <span className="dark-card-title">Regulatory Identity</span>
                                            <span className="dark-card-sub">Accreditations</span>
                                        </div>
                                    </div>

                                    <div className="dark-card-pills">
                                        <span className="dark-card-pill">Lic: {formData.license_number || "None"}</span>
                                        <span className="dark-card-pill">DOB: {formData.dob || "XX-XX"}</span>
                                        <span className="dark-card-pill">{formData.gender || "Gender"}</span>
                                    </div>
                                </div>

                                {/* Card 3: Consultation Format */}
                                <div className="dark-card">
                                    <div className="dark-card-header">
                                        <div className="dark-card-icon"><DollarSign size={20} color="var(--nn-primary)"/></div>
                                        <div className="dark-card-title-wrap">
                                            <span className="dark-card-title">Consultation Params</span>
                                            <span className="dark-card-sub">Monetization & Modes</span>
                                        </div>
                                    </div>

                                    <div className="dark-card-pills">
                                        <span className="dark-card-pill">Fee: ₹{formData.consultation_fee || 0}</span>
                                        <span className="dark-card-pill">Format: {formData.consultation_mode === 'Both' ? 'Online and Offline Consultation' : (formData.consultation_mode || "Mixed")}</span>
                                    </div>
                                </div>

                                {/* Card 4: Active Schedule */}
                                <div className="dark-card">
                                    <div className="dark-card-header">
                                        <div className="dark-card-icon" style={{ cursor: 'pointer' }} onClick={() => setIsAvailabilityModalOpen(true)}>
                                            <Clock size={20} color="var(--nn-primary)"/>
                                        </div>
                                        <div className="dark-card-title-wrap">
                                            <span className="dark-card-title">Active Schedule</span>
                                            <span className="dark-card-sub">Availability Range</span>
                                        </div>
                                    </div>

                                    <div className="dark-card-pills">
                                        {profile.availability && profile.availability.length > 0 ? (
                                            [...profile.availability].sort((a, b) => {
                                                const days = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
                                                const dayDiff = (days[a.day_of_week] || 0) - (days[b.day_of_week] || 0);
                                                if (dayDiff !== 0) return dayDiff;
                                                return (a.start_time || "").localeCompare(b.start_time || "");
                                            }).map((a, idx) => (
                                                <span key={idx} className="dark-card-pill">
                                                    {(a.day_of_week || '').substring(0, 3)}: {(a.start_time || '').substring(0, 5)} - {(a.end_time || '').substring(0, 5)}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="dark-card-pill">No Schedule Set</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        )}

                        {/* EDIT MODE (Configuration Tab or Editing triggered) */}
                        {(isEditing || activeTab === 'manage') && (
                            <div className="dark-edit-form">
                                <h4 className="text-white mb-4 fw-bold">Update Infrastructure Logic <br/><span className="text-secondary fw-normal fs-6">Manage data bindings for your core credentials.</span></h4>
                                
                                <div className="row">
                                    <div className="col-12 col-md-4 dark-input-group">
                                        <label className="dark-label">Contact Payload</label>
                                        <input name="phone" className="dark-input" value={formData.phone || ''} onChange={handleChange} placeholder="Phone Number" />
                                    </div>
                                    <div className="col-12 col-md-4 dark-input-group">
                                        <label className="dark-label">DoB Param</label>
                                        <input type="date" name="dob" className="dark-input" value={formData.dob || ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-12 col-md-4 dark-input-group">
                                        <label className="dark-label">Gender Entity</label>
                                        <select name="gender" className="dark-input" value={formData.gender || ''} onChange={handleChange}>
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="col-12"><hr style={{borderColor:'var(--nn-border)', margin:'10px 0 25px 0'}}/></div>

                                    <div className="col-12 col-md-6 dark-input-group">
                                        <label className="dark-label">License Reference</label>
                                        <input name="license_number" className="dark-input" value={formData.license_number || ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-12 col-md-6 dark-input-group">
                                        <label className="dark-label">Specialization Module</label>
                                        <select name="specialization" className="dark-input" value={formData.specialization || ''} onChange={handleChange}>
                                            <option value="">Select Value</option>
                                            {specialties.map(spec => (
                                                <option key={spec} value={spec}>{spec}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="col-12 col-md-6 dark-input-group">
                                        <label className="dark-label">Qualification Core</label>
                                        <input name="qualification" className="dark-input" value={formData.qualification || ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-12 col-md-6 dark-input-group">
                                        <label className="dark-label">Experience Runtime (Yrs)</label>
                                        <input type="number" name="experience_years" className="dark-input" value={formData.experience_years || ''} onChange={handleChange} />
                                    </div>

                                    <div className="col-12"><hr style={{borderColor:'var(--nn-border)', margin:'10px 0 25px 0'}}/></div>

                                    <div className="col-12 dark-input-group">
                                        <label className="dark-label">Hospital Cluster</label>
                                        <input name="hospital_name" className="dark-input" value={formData.hospital_name || ''} onChange={handleChange} />
                                    </div>

                                    <div className="col-12 dark-input-group">
                                        <label className="dark-label">Professional Summary / Bio</label>
                                        <textarea 
                                            name="bio" 
                                            className="dark-input" 
                                            value={formData.bio || ''} 
                                            onChange={handleChange} 
                                            rows={4}
                                            placeholder="Describe your clinical focus and professional summary..."
                                        />
                                    </div>
                                </div>

                                <div className="col-12"><hr style={{borderColor:'var(--nn-border)', margin:'35px 0 25px 0'}}/></div>
                                
                                {/* Experience Builder */}
                                <div className="mt-2">
                                    <h5 className="text-white mb-4 fw-bold d-flex align-items-center gap-2">
                                        <Award size={18} className="text-primary"/> Experience Matrix Builder
                                    </h5>
                                    
                                    {/* List view of experiences in Edit Mode */}
                                    {formData.experience && formData.experience.length > 0 && (
                                        <div className="mb-4">
                                            {formData.experience.map((exp) => (
                                                <div key={exp.id} className="dark-card mb-3 p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <div>
                                                        <h6 className="text-white mb-1 fw-bold">{exp.title}</h6>
                                                        <p className="mb-0 text-secondary" style={{ fontSize: '0.85rem' }}>{exp.hospital} | <span className="text-primary">{exp.period}</span></p>
                                                    </div>
                                                    <button 
                                                        className="btn btn-link text-danger p-0" 
                                                        onClick={() => handleDeleteExp(exp.id)}
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add New Experience Form */}
                                    <div className="dark-card p-4" style={{ backgroundColor: 'rgba(0,85,255,0.05)', border: '1px dashed rgba(0,85,255,0.3)' }}>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <label className="dark-label" style={{ fontSize: '0.75rem' }}>Job Title Key</label>
                                                <input 
                                                    className="dark-input" 
                                                    style={{ height: '42px', fontSize: '0.85rem' }} 
                                                    placeholder="e.g. Senior Neuro-Surgeon"
                                                    value={newExp.title}
                                                    onChange={e => setNewExp(prev => ({ ...prev, title: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label className="dark-label" style={{ fontSize: '0.75rem' }}>Hospital/Clinic Node</label>
                                                <input 
                                                    className="dark-input" 
                                                    style={{ height: '42px', fontSize: '0.85rem' }} 
                                                    placeholder="e.g. Central City Medical"
                                                    value={newExp.hospital}
                                                    onChange={e => setNewExp(prev => ({ ...prev, hospital: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-12 col-md-4">
                                                <label className="dark-label" style={{ fontSize: '0.75rem' }}>Timeline Range</label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <select 
                                                        className="dark-input" 
                                                        style={{ height: '42px', fontSize: '0.85rem' }}
                                                        value={newExp.startYear}
                                                        onChange={e => setNewExp(prev => ({ ...prev, startYear: e.target.value }))}
                                                    >
                                                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                    <span className="text-secondary">to</span>
                                                    <select 
                                                        className="dark-input" 
                                                        style={{ height: '42px', fontSize: '0.85rem' }}
                                                        value={newExp.endYear}
                                                        onChange={e => setNewExp(prev => ({ ...prev, endYear: e.target.value }))}
                                                    >
                                                        <option value="Present">Present</option>
                                                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-12 col-md-8">
                                                <label className="dark-label" style={{ fontSize: '0.75rem' }}>Role Logic Description</label>
                                                <input 
                                                    className="dark-input" 
                                                    style={{ height: '42px', fontSize: '0.85rem' }} 
                                                    placeholder="Brief outline of clinical responsibilities"
                                                    value={newExp.description}
                                                    onChange={e => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                                                />
                                            </div>
                                            <div className="col-12 d-flex justify-content-end">
                                                <button 
                                                    className="dark-btn-primary d-flex align-items-center gap-2" 
                                                    onClick={handleAddExp}
                                                    disabled={isExperienceLoading}
                                                    style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem' }}
                                                >
                                                    {isExperienceLoading ? "Processing..." : <><Plus size={16}/> Insert Experience</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="dark-form-actions">
                                    <button className="dark-btn-secondary" style={{ backgroundColor: 'var(--nn-surface-secondary)', color: '#fff', border: '1px solid var(--nn-divider)' }} onClick={() => { cancelEdit(); setActiveTab('overview'); }}>Cancel Sequence</button>
                                    <button className="dark-btn-primary" onClick={handleSave}>Execute Changes</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* FULL WIDTH SECTIONS BELOW SIDEBAR/CARDS GRID */}
                {!isEditing && activeTab === 'overview' && (
                    <div className="row mt-4 g-4">
                        {/* Left Column: Clinical Experience Timeline */}
                        <div className="col-lg-8">
                            <div className="dark-card h-100">
                                <div className="dark-card-header mb-2">
                                    <div className="dark-card-icon"><Award size={20} color="var(--nn-primary)"/></div>
                                    <div className="dark-card-title-wrap">
                                        <span className="dark-card-title">Clinical Experience Timeline</span>
                                        <span className="dark-card-sub">Career Progression & Roles</span>
                                    </div>
                                </div>
                                <div className="position-relative py-2 mt-4" style={{ paddingLeft: '32px' }}>
                                    {/* Timeline Line */}
                                    <div 
                                        className="position-absolute" 
                                        style={{ 
                                            left: '11px', 
                                            top: '8px', 
                                            bottom: '20px', 
                                            width: '2px', 
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                                        }}
                                    />

                                    {/* Timeline Items */}
                                    {profile.experience && profile.experience.length > 0 ? profile.experience.map((exp, idx) => (
                                        <div key={idx} className="position-relative mb-4 pb-2">
                                            {/* Node Marker */}
                                            <div 
                                                className="position-absolute rounded-circle" 
                                                style={{ 
                                                    left: '-27px', 
                                                    top: '4px', 
                                                    width: '14px', 
                                                    height: '14px', 
                                                    backgroundColor: idx === 0 ? 'var(--nn-primary)' : (isDark ? 'var(--nn-border)' : 'var(--nn-divider)'),
                                                    border: `3px solid ${isDark ? 'var(--nn-bg)' : 'var(--nn-surface)'}`,
                                                    zIndex: 2,
                                                    boxShadow: idx === 0 ? '0 0 0 3px color-mix(in srgb, var(--nn-primary) 20%, transparent)' : 'none'
                                                }}
                                            />
                                            <h5 className={`fw-bold mb-1 ${isDark ? 'text-white' : 'text-dark'}`} style={{ fontSize: '1.05rem', letterSpacing: '0.3px' }}>{exp.title}</h5>
                                            <div className="d-flex align-items-center mb-2 gap-2">
                                                <h6 className="mb-0" style={{ color: 'var(--nn-primary)', fontSize: '0.9rem', fontWeight: '600' }}>{exp.hospital}</h6>
                                                <span className="px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem', fontWeight: '600', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: isDark ? 'var(--nn-text-muted)' : 'var(--nn-text-muted)' }}>{exp.period}</span>
                                            </div>
                                            <p className="mb-0 mt-2" style={{ color: isDark ? 'var(--nn-text-muted)' : 'var(--nn-text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>{exp.description}</p>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4">
                                            <p className="mb-0" style={{ color: isDark ? 'var(--nn-text-muted)' : 'var(--nn-text-disabled)', fontSize: '0.9rem' }}>No clinical experience records mapped to this profile module.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Professional Summary */}
                        <div className="col-lg-4">
                            <div className="dark-card h-100">
                                <div className="dark-card-header mb-2">
                                    <div className="dark-card-icon"><Briefcase size={20} color="var(--nn-primary)"/></div>
                                    <div className="dark-card-title-wrap">
                                        <span className="dark-card-title">Professional Summary</span>
                                        <span className="dark-card-sub">Clinical Philosophy</span>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <p style={{ color: isDark ? 'var(--nn-text-muted)' : 'var(--nn-text-secondary)', fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                        {profile.bio || "No professional summary added yet. Focuses on creating scalable clinical experiences and elevating patient journeys."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AvailabilityModal 
                isOpen={isAvailabilityModalOpen}
                onClose={() => setIsAvailabilityModalOpen(false)}
                availability={profile.availability}
                onUpdate={handleAvailabilityUpdate}
            />
        </div>
    );
};

export default Profile;
