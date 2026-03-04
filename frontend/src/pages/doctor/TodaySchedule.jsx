import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSchedule, completeAppointment, cancelAppointment, markNoShow } from "../../api/doctor";
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
    const [imageErrors, setImageErrors] = useState({});
    const navigate = useNavigate();

    const fetchSchedule = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSchedule(selectedDate, statusFilter);
            setSchedule(data);
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

    // Dummy Pinned Data for aesthetic
    const pinnedItems = [
        { id: 1, title: "Call neurology lab for tests", time: "15 Mar 2026 • 9:00 AM", category: "Priority", desc: "Ask for follow-up blood tests results for Nezrin." },
        { id: 2, title: "Patient Review: Nezrin", time: "Every Thursday", category: "Case Review", desc: "Weekly synthesis of progress reports." }
    ];

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
                    <div className="ts-section-header">
                        <span className="ts-section-title">Weekly Pinned</span>
                        <span className="ts-view-all">View all</span>
                    </div>

                    <div className="ts-pinned-list d-flex flex-column gap-3">
                        {pinnedItems.map(item => (
                            <div key={item.id} className="ts-pinned-card">
                                <div className="ts-pinned-header">
                                    <div className="ts-pinned-icon">
                                        <Bookmark size={20} fill="currentColor" />
                                    </div>
                                    <div className="ts-pinned-meta">
                                        <h4 className="ts-pinned-title">{item.title}</h4>
                                        <span className="ts-pinned-time">{item.time}</span>
                                    </div>
                                </div>
                                <span className={`badge ${isDark ? 'bg-secondary' : 'bg-warning'} bg-opacity-10 text-warning px-2 py-1 rounded-pill mt-1`} style={{ fontSize: '0.6rem', width: 'fit-content' }}>
                                    {item.category}
                                </span>
                                <p className="ts-pinned-desc">{item.desc}</p>
                            </div>
                        ))}

                        <div className="ts-add-pinned" onClick={() => {
                            const title = prompt("Enter clinical pin title:");
                            if(title) alert("Feature integration: This pin will be synchronized with your professional archives.");
                        }}>
                            <div className="ts-add-icon">
                                <Plus size={20} />
                            </div>
                            <span className="fw-bold text-secondary small">Add new clinical pin</span>
                        </div>
                    </div>

                    {/* Minimal Calendar Mini-Widget */}
                    <div className="ts-pinned-card mt-4 p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-bold text-dark fs-6">March, 2026</span>
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
                                return (
                                    <div 
                                        key={i} 
                                        className={`text-center py-1 rounded-circle fw-bold transition-all ${isSelected ? 'bg-warning text-white shadow-sm' : isDark ? 'text-light hover-bg-dark' : 'text-dark hover-bg-light'}`} 
                                        style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                                        onClick={() => {
                                            const newDate = new Date(selectedDate);
                                            newDate.setDate(dayNum);
                                            setSelectedDate(newDate.toISOString().split('T')[0]);
                                        }}
                                    >
                                        {dayNum}
                                    </div>
                                );
                            })}
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
                        {loading ? (
                            <div className="ts-appointment-card justify-content-center p-5 border-0">
                                <div className="spinner-border text-warning" role="status"></div>
                            </div>
                        ) : schedule.length === 0 ? (
                            <div className="ts-appointment-card justify-content-center p-5 text-center border-0">
                                <Bookmark size={48} className="text-muted opacity-20 mb-3" />
                                <h3 className="h5 fw-bold">Agenda Clear</h3>
                                <p className="text-muted small">No consultations linked to this station.</p>
                            </div>
                        ) : (
                            schedule.map((appointment) => {
                                const timeObj = formatDisplayTime(appointment.appointment_time);
                                const isFocused = appointment.status === 'approved' && Number(appointment.appointment_time?.substring(0, 2)) === new Date().getHours();
                                
                                return (
                                    <div key={appointment.id} className="ts-appointment-row">
                                        <div className="ts-time-marker">{timeObj.value} {timeObj.period}</div>
                                        <div 
                                            className={`ts-appointment-card ${isFocused ? 'ongoing shadow-lg' : ''}`}
                                            onClick={() => navigate(`/doctor/patient-records?patientId=${appointment.patient_id}`)}
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
                                                </div>
                                            </div>
                                            
                                            <div className="ts-card-actions d-flex align-items-center gap-3">
                                                <div className="ts-slot-badge">
                                                    {timeObj.value} {timeObj.period}
                                                </div>
                                                {appointment.status === 'approved' && (
                                                    <div className="d-flex gap-2">
                                                        <button 
                                                            className="btn btn-warning rounded-circle p-0 d-flex align-items-center justify-content-center text-white shadow-sm"
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
                            })
                        )}
                    </div>
                </div>

                {/* --- RIGHT: Widgets --- */}
                <div className="ts-right-panel">
                    <div className="ts-section-header">
                        <span className="ts-section-title">Focus & Metrics</span>
                    </div>

                    <div className="ts-clinic-time-card shadow-sm">
                        <span className="ts-clinic-time-label">Clinic Time</span>
                        <div className="ts-clinic-time-value d-flex align-items-center gap-2">
                             <Clock size={16} />
                             {liveTime}
                        </div>
                    </div>

                    <div className="ts-widget-row">
                        <div className="ts-widget-square">
                            <div className="ts-widget-icon bg-danger-subtle text-danger">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="fw-bolder fs-3 mb-0">{schedule.filter(a => a.status === 'approved').length}</h4>
                                <span className="text-muted small fw-bold">Pending Slots</span>
                            </div>
                        </div>
                        <div className="ts-widget-square">
                            <div className="ts-widget-icon bg-info-subtle text-info">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <h4 className="fw-bolder fs-3 mb-0">{schedule.filter(a => a.status === 'completed').length}</h4>
                                <span className="text-muted small fw-bold">Completed</span>
                            </div>
                        </div>
                    </div>

                    <div className="ts-summary-card">
                         <h3 className="h6 fw-bolder text-dark mb-1">Today's Summary</h3>
                         <div className="ts-summary-item">
                             <span className="ts-summary-label">Total Appointments</span>
                             <span className="ts-summary-value">{schedule.length}</span>
                         </div>
                         <div className="ts-summary-item">
                             <span className="ts-summary-label">Completed</span>
                             <span className="ts-summary-value text-success">{schedule.filter(a => a.status === 'completed').length}</span>
                         </div>
                         <div className="ts-summary-item">
                             <span className="ts-summary-label">Pending</span>
                             <span className="ts-summary-value text-warning">{schedule.filter(a => a.status === 'approved').length}</span>
                         </div>
                         <div className="ts-summary-item pt-2 border-top">
                             <span className="ts-summary-label">Overtime Risk</span>
                             <span className={`ts-summary-value ${schedule.filter(a => a.status === 'approved').length > 5 ? 'risk-high' : 'text-success'}`}>
                                 {schedule.filter(a => a.status === 'approved').length > 5 ? 'High Risk' : 'Low Risk'}
                             </span>
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TodaySchedule;
