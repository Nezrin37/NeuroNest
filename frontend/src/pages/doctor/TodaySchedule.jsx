import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
    getSchedule, completeAppointment, cancelAppointment, markNoShow,
    getClinicalPins, createClinicalPin, updateClinicalPin
} from "../../api/doctor";
import { 
    Clock, Calendar, ChevronRight, FileText,
    ChevronLeft, Check, X, Filter, Bookmark, Plus, 
    Zap, Headphones, CloudSun, UserCheck, Timer
} from "lucide-react";
import { toAssetUrl } from "../../utils/media";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/today-schedule.css";

const TodaySchedule = () => {
    const { isDark } = useTheme();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');  // all / online / in_person
    const [imageErrors, setImageErrors] = useState({});
    const [isAddingPin, setIsAddingPin] = useState(false);
    const [newPinData, setNewPinData] = useState({ title: "", date: "", time: "", desc: "" });
    const [pinnedItems, setPinnedItems] = useState([]);
    const navigate = useNavigate();

    const fetchSchedule = useCallback(async () => {
        try {
            setLoading(true);
            const [scheduleData, pinsData] = await Promise.all([
                getSchedule(selectedDate, statusFilter),
                getClinicalPins()
            ]);
            setSchedule(scheduleData);
            setPinnedItems(pinsData);
        } catch (err) {
            console.error("Error fetching schedule:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, statusFilter]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleDateStep = (days) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleAction = async (id, type) => {
        try {
            if (type === 'complete') await completeAppointment(id);
            if (type === 'cancel') await cancelAppointment(id);
            if (type === 'no-show') await markNoShow(id);
            await fetchSchedule();
        } catch (err) {
            console.error(`Error performing ${type}:`, err);
        }
    };

    const formatDisplayTime = (time) => {
        if (!time) return { value: "--:--", period: "" };
        const [hourStr, minute = "00"] = time.split(":");
        const hourNum = Number(hourStr);
        if (Number.isNaN(hourNum)) return { value: time.substring(0, 5), period: "" };
        const period = hourNum >= 12 ? "PM" : "AM";
        const hour12 = hourNum % 12 || 12;
        return { value: `${hour12}:${minute}`, period };
    };

    const displayDate = useMemo(() => {
        const d = new Date(selectedDate);
        return {
            weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
            day: d.getDate()
        };
    }, [selectedDate]);

    const handleAddPin = async () => {
        if (!newPinData.title) return;
        try {
            const payload = {
                title: newPinData.title,
                date: newPinData.date,
                time: newPinData.time,
                description: newPinData.desc,
                category: "General"
            };
            await createClinicalPin(payload);
            
            // Re-fetch to get sorted list
            const updatedPins = await getClinicalPins();
            setPinnedItems(updatedPins);
            
            setIsAddingPin(false);
            setNewPinData({ title: "", date: "", time: "", desc: "" });
        } catch (err) {
            console.error("Error adding pin:", err);
        }
    };

    const togglePinCompletion = async (id, currentStatus) => {
        try {
            await updateClinicalPin(id, { completed: !currentStatus });
            
            // Re-fetch to maintain correct sorting (completed at bottom)
            const updatedPins = await getClinicalPins();
            setPinnedItems(updatedPins);
        } catch (err) {
            console.error("Error toggling pin:", err);
        }
    };

    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const [liveTime, setLiveTime] = useState(currentTime);

    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`ts-page ${isDark ? 'dark' : ''}`}>
            <div className="ts-main-container">
                
                {/* --- LEFT: Weekly Pinned --- */}
                <div className="ts-left-panel">


                    <div className="ts-pinned-main-container">
                        <div className="ts-pinned-scroller">
                            {pinnedItems.map(item => (
                                <div key={item.id} className={`ts-pin-item ${item.completed ? 'completed' : ''}`}>
                                    <div className="ts-pin-header">
                                        <div className="ts-pin-check-wrapper" onClick={() => togglePinCompletion(item.id, item.completed)}>
                                            <div className={`ts-pin-checkbox ${item.completed ? 'checked' : ''}`}>
                                                {item.completed && <Check size={12} strokeWidth={4} />}
                                            </div>
                                        </div>
                                        <div className="ts-pin-meta">
                                            <h4 className="ts-pin-title">{item.title}</h4>
                                            <span className="ts-pin-time">{item.date} {item.time ? `• ${item.time}` : ""}</span>
                                        </div>
                                    </div>
                                    {item.category && (
                                        <span className="badge px-2 py-1 rounded-pill" style={{ fontSize: '0.6rem', width: 'fit-content', marginLeft: '34px', color: 'var(--nn-primary)', background: 'color-mix(in srgb, var(--nn-primary) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--nn-primary) 26%, transparent)' }}>
                                            {item.category}
                                        </span>
                                    )}
                                    <p className="ts-pin-desc" style={{ marginLeft: '34px' }}>{item.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="ts-add-pin-btn" onClick={() => setIsAddingPin(true)}>
                            <Plus size={16} /> Add Clinical Note
                        </div>
                    </div>




                </div>

                {/* --- CENTER: Schedule --- */}
                <div className="ts-center-panel">
                    <div className="ts-schedule-head">
                        <div>
                            <h1 className="ts-today-title">Today's schedule</h1>
                            <h2 className="ts-date-sub">{displayDate.weekday} {displayDate.day}</h2>
                        </div>
                        <div className="ts-nav-controls">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-select form-select-sm border-0 bg-transparent fw-bold text-muted me-2"
                                style={{ fontSize: '0.8rem', cursor: 'pointer', width: 'auto' }}
                            >
                                <option value="all">Every Patient</option>
                                <option value="Approved">Approved</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <div className="ts-nav-btn" onClick={() => handleDateStep(-1)}><ChevronLeft size={20} /></div>
                            <div className="ts-nav-btn" onClick={() => handleDateStep(1)}><ChevronRight size={20} /></div>
                        </div>
                    </div>



                    <div className="ts-schedule-list">
                        {/* ── Online / Offline Tabs ── */}
                        <div style={{
                            display: 'flex', gap: '8px', marginBottom: '16px',
                            padding: '4px', background: 'var(--nn-surface-secondary)',
                            borderRadius: '12px', border: '1px solid var(--nn-border)'
                        }}>
                            {[
                                { key: 'all',       label: 'All',       icon: '📋', color: 'var(--nn-text-muted)', activeBg: 'var(--nn-surface)', count: schedule.length },
                                { key: 'online',    label: 'Online',    icon: '💻', color: 'var(--nn-info)', activeBg: 'var(--nn-info-bg)', count: schedule.filter(a => (a.consultation_type || 'in_person') === 'online').length },
                                { key: 'in_person', label: 'In-Person', icon: '🏥', color: 'var(--nn-primary-hover)', activeBg: 'var(--nn-primary-light)', count: schedule.filter(a => (a.consultation_type || 'in_person') === 'in_person').length },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setModeFilter(tab.key)}
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: '10px',
                                        border: 'none', cursor: 'pointer',
                                        background: modeFilter === tab.key ? tab.activeBg : 'transparent',
                                        color: modeFilter === tab.key ? tab.color : 'var(--nn-text-muted)',
                                        fontWeight: modeFilter === tab.key ? 700 : 500,
                                        fontSize: '13px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                        boxShadow: modeFilter === tab.key ? 'var(--nn-shadow-soft)' : 'none',
                                    }}
                                >
                                    {tab.icon} {tab.label}
                                    <span style={{
                                        background: modeFilter === tab.key ? tab.color : 'var(--nn-border)',
                                        color: modeFilter === tab.key ? 'var(--nn-surface)' : 'var(--nn-text-muted)',
                                        borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 800
                                    }}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="ts-appointment-card justify-content-center p-5 border-0">
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        ) : (() => {
                            const filtered = modeFilter === 'all'
                                ? schedule
                                : schedule.filter(a => (a.consultation_type || 'in_person') === modeFilter);
                            if (filtered.length === 0) return (
                                <div className="nn-card d-flex flex-column align-items-center justify-content-center p-8 text-center" style={{ minHeight: '410px', borderStyle: 'dashed' }}>
                                    <div className="mb-4 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--nn-surface-secondary)', color: 'var(--nn-primary)' }}>
                                        <Calendar size={32} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-section-title mb-2">No appointments scheduled</h3>
                                    <p className="text-body mb-4" style={{ color: 'var(--nn-text-secondary)' }}>You are free today.</p>
                                    <button className="btn btn-primary rounded-pill fw-bold shadow-sm d-flex align-items-center" style={{ padding: '14px 32px', fontSize: '0.85rem' }} onClick={() => navigate('/doctor/settings', { state: { initialTab: 'schedule' } })}>
                                        Add availability
                                    </button>
                                </div>
                            );
                            return filtered.map((appointment) => {
                                const timeObj = formatDisplayTime(appointment.appointment_time);
                                const isFocused = appointment.status === 'approved' && Number(appointment.appointment_time?.substring(0, 2)) === new Date().getHours();
                                const isOnline = (appointment.consultation_type || 'in_person') === 'online';
                                return (
                                    <div key={appointment.id} className="ts-appointment-row">
                                        <div className="ts-time-marker">{timeObj.value} {timeObj.period}</div>
                                        <div
                                            className={`ts-appointment-card ${isFocused ? 'ongoing shadow-lg' : ''}`}
                                            onClick={() => navigate(`/doctor/patient-hub?patientId=${appointment.patient_id}`)}
                                        >
                                            <div className="ts-card-info">
                                                <div className="ts-patient-avatar">
                                                    {appointment.patient_image && !imageErrors[appointment.id] ? (
                                                        <img
                                                            src={toAssetUrl(appointment.patient_image)}
                                                            alt=""
                                                            onError={() => setImageErrors(p => ({...p, [appointment.id]: true}))}
                                                            className="w-100 h-100 object-fit-cover"
                                                        />
                                                    ) : (
                                                        appointment.patient_name?.charAt(0) || 'P'
                                                    )}
                                                </div>
                                                <div className="ts-patient-details">
                                                    <span className="ts-patient-name">{appointment.patient_name}</span>
                                                    <div className="ts-reason-pill">
                                                        <FileText size={12} /> {appointment.reason || "Routine Clinical Assessment"}
                                                    </div>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        fontSize: '11px', fontWeight: 700, marginTop: '4px',
                                                        padding: '2px 8px', borderRadius: '6px',
                                                        background: isOnline ? 'var(--nn-info-bg)' : 'var(--nn-primary-light)',
                                                        color: isOnline ? 'var(--nn-info)' : 'var(--nn-primary-hover)',
                                                    }}>
                                                        {isOnline ? '💻 Online' : '🏥 In-Person'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ts-card-actions d-flex align-items-center gap-3">
                                                <div className="ts-slot-badge">{timeObj.value} {timeObj.period}</div>
                                                {appointment.status === 'approved' && (
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-primary rounded-circle p-0 d-flex align-items-center justify-content-center text-white shadow-sm"
                                                            style={{ width: '32px', height: '32px' }}
                                                            onClick={(e) => { e.stopPropagation(); handleAction(appointment.id, 'complete'); }}
                                                        >
                                                            <Check size={16} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger border-0 rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                            style={{ width: '32px', height: '32px' }}
                                                            onClick={(e) => { e.stopPropagation(); handleAction(appointment.id, 'cancel'); }}
                                                        >
                                                            <X size={16} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* --- RIGHT: Widgets --- */}
                <div className="ts-right-panel">
                    <div className="ts-section-header">
                        <span className="ts-section-title">Today's Overview</span>
                    </div>

                    <div className="ts-clinic-time-card shadow-sm">
                        <span className="ts-clinic-time-label">Clinic Time</span>
                        <div className="ts-clinic-time-value d-flex align-items-center gap-2">
                             <span className="ts-live-dot"></span>
                             <Clock size={16} />
                             {liveTime}
                        </div>
                    </div>

                    {/* Minimal Calendar Mini-Widget */}
                    <div className="ts-pinned-main-container p-4 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className={`fw-bold fs-6 ${isDark ? 'text-light' : 'text-dark'}`}>March, 2026</span>
                            <div className="d-flex gap-2">
                                <ChevronLeft size={16} className="text-muted" />
                                <ChevronRight size={16} className="text-muted" />
                            </div>
                        </div>
                        <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                            {['M','T','W','T','F','S','S'].map((d, i) => <span key={i} className={`text-muted text-center fw-bold`} style={{ fontSize: '0.6rem' }}>{d}</span>)}
                            {Array.from({length: 31}).map((_, i) => {
                                const dayNum = i + 1;
                                const isSelected = dayNum === displayDate.day;
                                const hasAppointment = schedule.some(a => new Date(a.appointment_time).getDate() === dayNum);
                                return (
                                    <div 
                                        key={i} 
                                        className={`text-center py-1 rounded-circle fw-bold transition-all position-relative ${isSelected ? 'bg-primary text-white shadow-sm' : isDark ? 'text-light hover-bg-dark' : 'text-dark hover-bg-light'}`} 
                                        style={{ fontSize: '0.75rem', cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => {
                                            const newDate = new Date(selectedDate);
                                            newDate.setDate(dayNum);
                                            setSelectedDate(newDate.toISOString().split('T')[0]);
                                        }}
                                    >
                                        {dayNum}
                                        {hasAppointment && !isSelected && (
                                            <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--nn-primary)' }} />
                                        )}
                                        {hasAppointment && isSelected && (
                                            <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'white' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="ts-compact-stats d-flex flex-column gap-1">
                        <div className="ts-stat-tag-simple">
                            <h3 className="ts-stat-label-h3">Total Appointments</h3>
                            <span className="ts-stat-dash"></span>
                            <span className="ts-stat-val-large">{schedule.length}</span>
                        </div>
                        <div className="ts-stat-tag-simple">
                            <h3 className="ts-stat-label-h3 text-primary">Pending Slots</h3>
                            <span className="ts-stat-dash"></span>
                            <span className="ts-stat-val-large text-primary">{schedule.filter(a => a.status === 'approved').length}</span>
                        </div>
                        <div className="ts-stat-tag-simple">
                            <h3 className="ts-stat-label-h3 text-success">Completed</h3>
                            <span className="ts-stat-dash"></span>
                            <span className="ts-stat-val-large text-success">{schedule.filter(a => a.status === 'completed').length}</span>
                        </div>
                        <div className="ts-stat-tag-simple">
                            <h3 className="ts-stat-label-h3 text-danger">Cancelled</h3>
                            <span className="ts-stat-dash"></span>
                            <span className="ts-stat-val-large text-danger">{schedule.filter(a => a.status === 'cancelled').length}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- POP-UP MODAL CARD (OUTSIDE MAIN Flex) --- */}
            {isAddingPin && (
                <div className="ts-modal-overlay">
                    <div className="ts-modal-card">
                        <div className="ts-modal-header">
                            <h3 className="ts-modal-title">New Clinical Pin</h3>
                            <div className="ts-modal-close" onClick={() => setIsAddingPin(false)}>
                                <X size={20} />
                            </div>
                        </div>

                        <div className="ts-modal-body">
                            <div className="ts-input-group">
                                <label className="ts-input-label">Pin Title</label>
                                <input 
                                    autoFocus
                                    className="ts-modal-input"
                                    placeholder="e.g. Lab Report Review"
                                    value={newPinData.title}
                                    onChange={(e) => setNewPinData(p => ({...p, title: e.target.value}))}
                                />
                            </div>

                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="ts-input-group">
                                        <label className="ts-input-label">Schedule Date</label>
                                        <div className="position-relative">
                                            <input 
                                                type="date"
                                                className="ts-modal-input"
                                                value={newPinData.date}
                                                onChange={(e) => setNewPinData(p => ({...p, date: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="ts-input-group">
                                        <label className="ts-input-label">Clinical Time</label>
                                        <div className="position-relative">
                                            <input 
                                                type="time"
                                                className="ts-modal-input"
                                                value={newPinData.time}
                                                onChange={(e) => setNewPinData(p => ({...p, time: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="ts-input-group">
                                <label className="ts-input-label">Clinical Description</label>
                                <textarea 
                                    className="ts-modal-input"
                                    rows="3"
                                    placeholder="Detailed follow-up clinical notes..."
                                    value={newPinData.desc}
                                    onChange={(e) => setNewPinData(p => ({...p, desc: e.target.value}))}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="ts-modal-footer">
                            <button className="ts-modal-btn cancel" onClick={() => setIsAddingPin(false)}>Cancel</button>
                            <button className="ts-modal-btn save" onClick={handleAddPin}>
                                <Check size={18} /> Save Pin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TodaySchedule;
