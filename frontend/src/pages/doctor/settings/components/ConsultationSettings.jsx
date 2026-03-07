import React, { useState } from 'react';
import { IndianRupee, Video, MapPin, Search, AlertTriangle, Save } from 'lucide-react';
import { updateDoctorConsultationSettings } from '../../../../api/doctor';

const ConsultationSettings = ({ data, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        consultation_fee: data?.consultation_fee || 500,
        consultation_mode: data?.consultation_mode || 'Online',
        cancellation_policy_hours: data?.cancellation_policy_hours || 24,
        auto_cancel_unpaid_minutes: data?.auto_cancel_unpaid_minutes || 15,
    });
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (saveStatus) setSaveStatus(null);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveStatus(null);
            const res = await updateDoctorConsultationSettings(formData);
            setSaveStatus('success');
            if (onSaveSuccess) onSaveSuccess(res.settings);
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error("Failed to update consultation settings", error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-pane-container">
            <div className="pane-header">
                <h2>Consultation Terms</h2>
                <p>Manage your fees, operational modes, and enforcement policies.</p>
            </div>

            <div className="pane-form-grid">
                <div className="form-group-box">
                    <div className="form-group-header">
                        <IndianRupee size={16} className="text-emerald-500" />
                        <h3>Financial Configuration</h3>
                    </div>
                    
                    <div className="form-field">
                        <label>Base Consultation Fee (₹)</label>
                        <input 
                            type="number"
                            name="consultation_fee" 
                            value={formData.consultation_fee} 
                            onChange={handleChange}
                            className="premium-input"
                            min="0" step="50"
                        />
                    </div>
                </div>

                <div className="form-group-box">
                    <div className="form-group-header">
                        <Video size={16} className="text-blue-500" />
                        <h3>Operational Mode</h3>
                    </div>
                    
                    <div className="form-field">
                        <label>Availability Type</label>
                        <div className="radio-cards-grid">
                            <label className={`radio-card ${formData.consultation_mode === 'Online' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="consultation_mode" 
                                    value="Online"
                                    checked={formData.consultation_mode === 'Online'}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <div className="card-content">
                                    <h4 className="flex items-center gap-2"><Video size={14}/> Online Only</h4>
                                    <p>Telehealth/Video consultations globally.</p>
                                </div>
                                <div className="card-indicator"></div>
                            </label>

                            <label className={`radio-card ${formData.consultation_mode === 'Offline' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="consultation_mode" 
                                    value="Offline"
                                    checked={formData.consultation_mode === 'Offline'}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <div className="card-content">
                                    <h4 className="flex items-center gap-2"><MapPin size={14}/> In-Clinic Only</h4>
                                    <p>Physical visits at your designated location.</p>
                                </div>
                                <div className="card-indicator"></div>
                            </label>

                            <label className={`radio-card ${formData.consultation_mode === 'Both' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="consultation_mode" 
                                    value="Both"
                                    checked={formData.consultation_mode === 'Both'}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <div className="card-content">
                                    <h4 className="flex items-center gap-2"><Search size={14}/> Hybrid (Both)</h4>
                                    <p>Patient can choose during booking.</p>
                                </div>
                                <div className="card-indicator"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="form-group-box">
                    <div className="form-group-header">
                        <AlertTriangle size={16} className="text-orange-500" />
                        <h3>Policies</h3>
                    </div>
                    
                    <div className="form-field">
                        <label>Patient Cancellation Policy</label>
                        <select 
                            name="cancellation_policy_hours" 
                            value={formData.cancellation_policy_hours} 
                            onChange={handleChange}
                            className="premium-select"
                        >
                            <option value="0">Anytime (No penalty)</option>
                            <option value="12">Up to 12 hours before</option>
                            <option value="24">Up to 24 hours before (Standard)</option>
                            <option value="48">Up to 48 hours before</option>
                        </select>
                        <p className="field-hint">Defines the cutoff time before the appointment when patients are no longer allowed to cancel.</p>
                    </div>
                </div>
            </div>

            <div className="pane-footer fixed-pane-footer">
                {saveStatus === 'success' && <span className="success-text">Terms updated successfully</span>}
                {saveStatus === 'error' && <span className="error-text">Update failed. Try again.</span>}
                <button onClick={handleSave} disabled={saving} className="btn-save-premium">
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Terms'}
                </button>
            </div>
        </div>
    );
};

export default ConsultationSettings;
