import { useState, useEffect } from "react";
import { getAppointmentRequests, approveAppointment, rejectAppointment } from "../../api/doctor";
import {
  Check, X, Clock, Calendar, MessageSquare,
  CheckCircle2, XCircle, Inbox, RefreshCw,
  Stethoscope, AlertCircle, ChevronRight,
  TrendingUp, Users, Activity, Plus, Search,
  PieChart, MessageCircle, BarChart3, Star, Layers
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/appointment-requests.css";

const AppointmentRequests = () => {
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const { isDark }                    = useTheme();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [filterType, setFilterType] = useState("All"); // All, Online, In-person
  const [filterTime, setFilterTime] = useState("All"); // All, Today, This Week
  const [sortBy, setSortBy] = useState("Time"); // Time, Priority

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getAppointmentRequests();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      if (action === "approve") {
        await approveAppointment(id);
      } else if (action === "reject") {
        await rejectAppointment(id);
      }
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(`Error ${action}ing:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRescheduleSubmit = async (e) => {
     e.preventDefault();
     // API call would go here
     console.log("Rescheduling", selectedRequest.id);
     setShowReschedule(false);
     setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
  };

  // ── Logic ────────────────────────────────────────────────
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (req.reason && req.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "All" || req.consultation_type === filterType;
    
    let matchesTime = true;
    if (filterTime === "Today") {
       const today = new Date().toISOString().split('T')[0];
       matchesTime = req.appointment_date === today;
    } else if (filterTime === "This Week") {
       const diff = (new Date(req.appointment_date) - new Date()) / (1000 * 60 * 60 * 24);
       matchesTime = diff >= 0 && diff <= 7;
    }

    return matchesSearch && matchesType && matchesTime;
  }).sort((a, b) => {
     if (sortBy === "Priority") {
        const aU = isUrgent(a.appointment_date) ? 1 : 0;
        const bU = isUrgent(b.appointment_date) ? 1 : 0;
        return bU - aU;
     }
     const timeA = new Date(a.appointment_date + 'T' + (a.appointment_time || "00:00"));
     const timeB = new Date(b.appointment_date + 'T' + (b.appointment_time || "00:00"));
     return timeA - timeB;
  });

  const urgentCasesCount = requests.filter(r => isUrgent(r.appointment_date)).length;
  const capacity = Math.min(Math.round((requests.length / 15) * 100), 100);

  if (loading) {
    return (
      <div className={`ar-page ${isDark ? 'dark' : ''} text-center py-5`}>
        <RefreshCw className="ar-spin text-primary" size={40} />
        <p className="mt-3 text-muted fw-bold">Synchronizing Clinical Triage...</p>
      </div>
    );
  }

  return (
    <div className={`ar-page ${isDark ? 'dark' : ''}`}>
      
      {/* ── KPI Row ── */}
      <div className="ar-stats-row">
         <StatCard title="Pending Requests" value={requests.length} icon={<Layers size={18} />} color="#3b82f6" bg="#eff6ff" />
         <StatCard title="Urgent Cases" value={urgentCasesCount} icon={<AlertCircle size={18} />} color="#ef4444" bg="#fef2f2" />
         <StatCard title="Auto-Scheduled %" value="98%" icon={<CheckCircle2 size={18} />} color="#10b981" bg="#ecfdf5" />
         <StatCard title="Today's Load" value="6" icon={<Calendar size={18} />} color="#8b5cf6" bg="#f5f3ff" />
      </div>

      {/* ── Filter Bar ── */}
      <div className="ar-filter-row">
         <div className="ar-search-box">
            <Search className="ar-search-icon" size={18} />
            <input 
               type="text" 
               className="ar-search-input" 
               placeholder="Find patient case by name or ID..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="ar-filter-group">
            <select className="ar-select-pill" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
               <option value="All">All Types</option>
               <option value="Online">Online Only</option>
               <option value="In-person">In-person</option>
            </select>
            <select className="ar-select-pill" value={filterTime} onChange={(e) => setFilterTime(e.target.value)}>
               <option value="All">Any Time</option>
               <option value="Today">Today</option>
               <option value="This Week">This Week</option>
            </select>
            <select className="ar-select-pill" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
               <option value="Time">Sort by Time</option>
               <option value="Priority">Sort by Priority</option>
            </select>
            <button className="ar-select-pill bg-light d-flex align-items-center justify-content-center" onClick={handleRefresh} style={{ width: 42, padding: 0 }}>
               <RefreshCw size={16} className={refreshing ? "ar-spin" : ""} />
            </button>
         </div>
      </div>

      <div className="ar-layout-grid">
         
         <div className="ar-main-col">
            <div className="ar-list-stack">
               {filteredRequests.length > 0 ? (
                  filteredRequests.map(req => (
                     <RequestCard 
                        key={req.id} 
                        req={req} 
                        onAction={handleAction} 
                        onReschedule={() => { setSelectedRequest(req); setShowReschedule(true); }}
                        actionLoading={actionLoading} 
                     />
                  ))
               ) : (
                  <div className="ar-empty-state">
                     <Inbox size={40} className="text-muted mb-2" />
                     <h3>No matching requests</h3>
                     <p>Adjust your filters or sync the dashboard.</p>
                  </div>
               )}
            </div>
         </div>

         <div className="ar-sidebar-col">
            <div className="ar-insight-card">
               <div className="ar-ai-header">
                  <Activity size={16} /> AI Clinical Insights
               </div>
               <div className="mt-2">
                  <div className="d-flex justify-content-between mb-1">
                     <span className="small fw-bold">Daily Capacity</span>
                     <span className={`small fw-bold ${capacity > 85 ? 'text-danger' : 'text-primary'}`}>{capacity}%</span>
                  </div>
                  <div className="ar-cap-meter">
                     <div className="ar-cap-fill" style={{ width: `${capacity}%`, background: capacity > 85 ? '#ef4444' : '#3b82f6' }}></div>
                  </div>
               </div>
               {capacity > 85 && (
                  <div className="ar-alert-overload mt-2">
                     <AlertCircle size={14} /> Critical overload risk detected.
                  </div>
               )}
               <div className="ar-insight-msg mt-3">
                  <Star size={14} className="text-warning me-1" />
                  <strong>Peak Alert:</strong> Expected bottleneck at <strong>3:00 PM</strong>. Suggest prioritizing online consults for efficiency.
               </div>
            </div>

            <div className="ar-widget">
               <h3 className="ar-widget-title">Burnout Meter</h3>
               <div className="d-flex align-items-center gap-3">
                  <div className={`p-2 rounded-circle ${capacity > 80 ? 'bg-danger-subtle' : 'bg-success-subtle'}`}>
                     <Activity size={18} className={capacity > 80 ? 'text-danger' : 'text-success'} />
                  </div>
                  <div className="small fw-bold text-muted">
                     {capacity > 80 ? "High Risk: Take a break." : "Optimal Load: You're doing great!"}
                  </div>
               </div>
            </div>

            <div className="ar-widget">
               <h3 className="ar-widget-title">Peer Discussion</h3>
               <div className="d-flex flex-column gap-3">
                  <div className="d-flex gap-2">
                     <img src="https://api.dicebear.com/7.x/initials/svg?seed=JD" className="rounded-circle" style={{ width: 24, height: 24 }} alt="" />
                     <div className="p-2 bg-light rounded small">Can you check Labs for #392?</div>
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                     <div className="p-2 bg-primary text-white rounded small">Checking now.</div>
                  </div>
                  <button className="btn btn-sm btn-outline-primary w-100 py-1" style={{ fontSize: '0.75rem' }}>Open Chat</button>
               </div>
            </div>
         </div>
      </div>

      {/* ── Reschedule Modal ── */}
      {showReschedule && (
         <div className="ar-modal-overlay">
            <div className="ar-modal-content">
               <div className="ar-modal-header">
                  <h3 className="ar-modal-title">Reschedule Proposal</h3>
                  <button className="btn-close shadow-none" onClick={() => setShowReschedule(false)}></button>
               </div>
               <div className="ar-modal-body">
                  <div className="ar-current-info">
                     Current: <strong>{formatDate(selectedRequest.appointment_date)}</strong> at <strong>{formatTime(selectedRequest.appointment_time)}</strong>
                  </div>
                  <form onSubmit={handleRescheduleSubmit} className="ar-modal-body p-0">
                     <div className="ar-form-group">
                        <label className="ar-form-label">New Consultation Date</label>
                        <input type="date" className="ar-input-field" defaultValue={selectedRequest.appointment_date} required />
                     </div>
                     <div className="ar-form-group">
                        <label className="ar-form-label">Available Slots</label>
                        <div className="ar-quick-slots">
                           <button type="button" className="ar-slot-btn">Next Available</button>
                           <button type="button" className="ar-slot-btn">Tomorrow Morning</button>
                           <button type="button" className="ar-slot-btn">Same Time tomorrow</button>
                           <button type="button" className="ar-slot-btn">Move to Evening</button>
                        </div>
                     </div>
                     <div className="ar-form-group">
                        <label className="ar-form-label">Reason for Reschedule</label>
                        <select className="ar-input-field">
                           <option>Clinic Overbooked</option>
                           <option>Emergency Case</option>
                           <option>Doctor Unavailable</option>
                        </select>
                     </div>
                     <div className="d-flex align-items-center gap-2 mt-2">
                        <input type="checkbox" id="notify" defaultChecked />
                        <label htmlFor="notify" className="small fw-bold text-muted">Automatically notify patient via SMS/Email</label>
                     </div>
                     <div className="ar-modal-footer">
                        <button type="button" className="ar-btn-outline w-100" onClick={() => setShowReschedule(false)}>Cancel</button>
                        <button type="submit" className="ar-btn-primary w-100">Send Proposal</button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

// ── Sub-components ───────────────────────────────────────
const StatCard = ({ title, value, icon, color, bg }) => (
   <div className="ar-stat-card">
      <div className="ar-stat-header">
         <div className="ar-stat-icon-box" style={{ backgroundColor: bg, color: color }}>{icon}</div>
         <span className="ar-stat-title">{title}</span>
      </div>
      <div className="ar-stat-value">{value}</div>
   </div>
);

const RequestCard = ({ req, onAction, onReschedule, actionLoading }) => {
   const urgent = isUrgent(req.appointment_date);
   const dateStr = new Date(req.appointment_date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
   
   return (
      <div className={`ar-card ${urgent ? 'ar-card-urgent' : 'ar-card-active'}`}>
         <div className="ar-card-header">
            <div className="ar-patient-info-box">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.patient_name}`} alt="" className="ar-avatar-lg" />
               <div className="ar-name-stack">
                  <h4 className="ar-p-name">{req.patient_name}</h4>
                  <span className="ar-p-id">ID: #{req.id.toString().substring(0, 8)}</span>
               </div>
            </div>
            <div className="ar-time-badge">
               <Clock size={16} className="text-primary" />
               {dateStr} • {formatTime(req.appointment_time)}
            </div>
         </div>

         <div className="ar-card-metadata">
            <div className="ar-meta-item">
               <Stethoscope size={14} /> {req.consultation_type || 'General'}
            </div>
            <div className="ar-meta-item">
               <Clock size={14} /> 30 Min
            </div>
            {urgent && (
               <div className="ar-meta-item text-danger">
                  <AlertCircle size={14} /> URGENT
               </div>
            )}
         </div>

         <p className="ar-symptoms-preview">
            <strong>Reason:</strong> {req.reason || "Patient requested initial consultation regarding neurological baseline."}
         </p>

         <div className="ar-card-actions">
            <button className="ar-btn-primary" onClick={() => onAction(req.id, "approve")} disabled={!!actionLoading}>
               {actionLoading === req.id + "approve" ? <RefreshCw className="ar-spin" size={16} /> : "Accept Request"}
            </button>
            <button className="ar-btn-outline" onClick={onReschedule}>Reschedule</button>
            <button className="ar-btn-danger-soft" onClick={() => onAction(req.id, "reject")} disabled={!!actionLoading}>
               <X size={20} />
            </button>
         </div>
      </div>
   );
};

// ── Utilities ─────────────────────────────────────────────
const formatTime = (time) => {
   if (!time) return "N/A";
   const [h, m] = time.split(":");
   const hh = parseInt(h);
   return `${((hh + 11) % 12 + 1)}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const formatDate = (date) => new Date(date).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

const isUrgent = (date) => {
   if (!date) return false;
   const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
   return diff >= 0 && diff <= 2;
};

export default AppointmentRequests;
