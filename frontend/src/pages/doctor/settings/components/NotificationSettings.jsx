import React, { useState } from 'react';
import { Mail, BellRing, Clock, Save } from 'lucide-react';
import { updateDoctorNotificationSettings } from '../../../../api/doctor';

const NotificationSettings = ({ data, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        email_on_booking: data?.email_on_booking ?? true,
        in_app_notifications: data?.in_app_notifications ?? true,
        reminder_before_minutes: data?.reminder_before_minutes || 30,
    });
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
        if (saveStatus) setSaveStatus(null);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveStatus(null);
            const res = await updateDoctorNotificationSettings(formData);
            setSaveStatus('success');
            if (onSaveSuccess) onSaveSuccess(res.settings);
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error("Failed to update notification settings", error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-pane-container">
            <div className="pane-header">
                <h2>Notifications & Reminders</h2>
                <p>Configure how and when the system alerts you about schedule changes.</p>
            </div>

            <div className="pane-form-grid">
                <div className="form-group-box">
                    <div className="form-group-header">
                        <BellRing size={16} className="text-amber-500" />
                        <h3>Delivery Channels</h3>
                    </div>
                    
                    <div className="form-field">
                        <label>Appointment Booking & Cancellations</label>
                        <div className="radio-cards-grid">
                            {/* Email */}
                            <label className={`radio-card ${formData.email_on_booking ? 'active' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    name="email_on_booking"
                                    checked={formData.email_on_booking}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <div className="card-content">
                                    <h4 className="flex items-center gap-2"><Mail size={14}/> Email Alerts</h4>
                                    <p>Get instant professional summaries in your inbox.</p>
                                </div>
                                <div className="card-indicator"></div>
                            </label>

                            {/* In-App */}
                            <label className={`radio-card ${formData.in_app_notifications ? 'active' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    name="in_app_notifications"
                                    checked={formData.in_app_notifications}
                                    onChange={handleChange}
                                    style={{ display: 'none' }}
                                />
                                <div className="card-content">
                                    <h4 className="flex items-center gap-2"><BellRing size={14}/> In-App Badge</h4>
                                    <p>Silent visual notifications on your dashboard.</p>
                                </div>
                                <div className="card-indicator"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="form-group-box">
                    <div className="form-group-header">
                        <Clock size={16} className="text-blue-500" />
                        <h3>Smart Reminders</h3>
                    </div>
                    
                    <div className="form-field">
                        <label>Upcoming Consultation Alert</label>
                        <select 
                            name="reminder_before_minutes" 
                            value={formData.reminder_before_minutes} 
                            onChange={handleChange}
                            className="premium-select"
                        >
                            <option value="0">Do not remind me</option>
                            <option value="15">15 Minutes Before</option>
                            <option value="30">30 Minutes Before</option>
                            <option value="60">1 Hour Before</option>
                            <option value="120">2 Hours Before</option>
                        </select>
                        <p className="field-hint">We will push an alert to you shortly before your next session begins to ensure you are prepared.</p>
                    </div>
                </div>
            </div>

            <div className="pane-footer fixed-pane-footer">
                {saveStatus === 'success' && <span className="success-text">Notifications saved</span>}
                {saveStatus === 'error' && <span className="error-text">Update failed.</span>}
                <button onClick={handleSave} disabled={saving} className="btn-save-premium">
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettings;
