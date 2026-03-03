import { useState, useEffect } from "react";
import { getAppointmentRequests, approveAppointment, rejectAppointment } from "../../api/doctor";
import {
  Check, X, Clock, Calendar, MessageSquare,
  CheckCircle2, XCircle, Inbox, RefreshCw,
  Stethoscope, AlertCircle, ChevronRight,
  TrendingUp, Users, Activity, Plus, Search,
  PieChart, MessageCircle, BarChart3, Star, Layers,
  LayoutDashboard, User, Settings
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
  const [activeTab, setActiveTab] = useState("Queue"); // Queue, History

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
     setShowReschedule(false);
     setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (req.reason && req.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "All" || req.consultation_type === filterType;
    return matchesSearch && matchesType;
  });

  const urgentCount = requests.filter(r => isUrgent(r.appointment_date)).length;
  const capacity = Math.min(Math.round((requests.length / 15) * 100), 100);

  if (loading) {
    return (
      <div className="ar-page dark">
        <div className="ar-big-card text-center py-5">
           <RefreshCw className="ar-spin text-primary mb-3" size={48} />
           <h3 className="text-white">Clinical Data Sync...</h3>
           <p className="ar-stat-label">Initializing triage environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`ar-page ${isDark ? 'dark' : ''}`}>
      <div className="ar-big-card">
        {/* TOP BANNER */}
        <div className="ar-banner">
          <h1 className="ar-banner-title">Clinical Appointment Control</h1>
        </div>

        <div className="ar-content-row">
          {/* SIDEBAR */}
          <div className="ar-sidebar">
            <div className="ar-doctor-profile-card">
              <div className="ar-doc-avatar-wrap">
                <img 
                  src="https://api.dicebear.com/7.x/initials/svg?seed=Nayana" 
                  alt="Dr. Nayana" 
                  className="ar-doc-avatar" 
                />
              </div>
              <h2 className="ar-doc-name">Dr. Nayana</h2>
              <span className="ar-doc-title">Neurology Specialist</span>

              <div className="ar-vertical-stats">
                <SidebarStat label="Pending Intake" value={requests.length} color="#3b82f6" />
                <SidebarStat label="Urgent Alerts" value={urgentCount} color="#ef4444" />
                <SidebarStat label="Success Rate" value="98%" color="#10b981" />
                <SidebarStat label="Daily Load" value="65%" color="#8b5cf6" />
              </div>

              <button className="ar-btn-outline w-100 mt-4 d-flex align-items-center justify-content-center gap-2" style={{ padding: '12px', fontSize: '0.8rem' }} onClick={handleRefresh}>
                 <RefreshCw size={14} className={refreshing ? "ar-spin" : ""} /> Refresh Engine
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="ar-main-content">
            <div className="ar-header-actions">
              <div className="ar-tabs">
                <button 
                  className={`ar-tab-btn ${activeTab === "Queue" ? "active" : ""}`}
                  onClick={() => setActiveTab("Queue")}
                >
                  Clinical Queue
                </button>
                <button 
                  className={`ar-tab-btn ${activeTab === "History" ? "active" : ""}`}
                  onClick={() => setActiveTab("History")}
                >
                  History
                </button>
              </div>

              <div className="ar-controls-row">
                 <div className="ar-search-box">
                    <Search className="search-icon" size={18} />
                    <input 
                       type="text" 
                       placeholder="Filter by name, ID or reason..." 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <select className="ar-tab-btn" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ border: '1px solid #2a2a2a' }}>
                    <option value="All">All Types</option>
                    <option value="Online">Online</option>
                    <option value="In-person">Clinic</option>
                 </select>
              </div>
            </div>

            <div className="ar-dashboard-grid">
              <div className="ar-list-col">
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
                  <div className="ar-dark-card text-center py-5">
                    <Inbox size={48} className="text-muted mb-3 opacity-20" />
                    <h3 className="text-white">Queue is Clear</h3>
                    <p className="ar-stat-label">No pending appointment requests matches your filters.</p>
                  </div>
                )}
              </div>

              <div className="ar-side-col">
                <div className="ar-ai-panel">
                  <div className="ar-ai-header">
                    <Activity size={16} /> AI Clinical Insights
                  </div>
                  
                  <div className="ar-progress-shell">
                    <div className="ar-progress-fill" style={{ width: `${capacity}%`, backgroundColor: capacity > 80 ? '#ef4444' : '#7c3aed' }}></div>
                  </div>
                  <div className="ar-capacity-text">
                    <span>Clinical Capacity</span>
                    <span style={{ color: capacity > 80 ? '#ef4444' : 'inherit' }}>{capacity}%</span>
                  </div>

                  <div className="ar-ai-tip">
                    <Star size={14} className="text-warning mb-1 d-block" />
                    <strong>Smart Suggest:</strong> Clinical load is moderate. AI recommends handling the 3 urgent cases before the 2 PM peak hour.
                  </div>

                  <div className="mt-4 p-3 rounded-4 bg-black border border-secondary border-opacity-10">
                     <div className="d-flex align-items-center gap-3">
                        <div className="p-2 rounded-3 bg-secondary bg-opacity-10">
                           <LayoutDashboard size={18} className="text-secondary" />
                        </div>
                        <div>
                           <div className="small fw-bold text-white">Resource Check</div>
                           <div className="small text-muted" style={{ fontSize: '0.7rem' }}>All clinical modules operating normally</div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="ar-dark-card">
                   <h4 className="text-white small fw-bold mb-3">Burnout Prevention</h4>
                   <p className="small text-muted mb-0">Risk: <span className="text-success fw-bold">Low</span></p>
                   <p className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>Schedule optimized for physician well-being.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RESCHEDULE MODAL */}
      {showReschedule && (
        <div className="ar-modal-overlay">
          <div className="ar-modal-content" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="ar-modal-header border-0">
              <h3 className="ar-modal-title text-white">Reschedule Proposal</h3>
              <X className="text-muted cursor-pointer" onClick={() => setShowReschedule(false)} />
            </div>
            <div className="ar-modal-body">
              <div className="ar-current-info mb-4" style={{ backgroundColor: '#121212', borderColor: '#222' }}>
                Current: <strong className="text-white">{formatDate(selectedRequest.appointment_date)}</strong> at <strong className="text-white">{formatTime(selectedRequest.appointment_time)}</strong>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="d-flex flex-column gap-3">
                <div className="ar-form-group">
                  <label className="ar-form-label">Optimized Date</label>
                  <input type="date" className="ar-input-field" style={{ backgroundColor: '#121212', border: '1px solid #2a2a2a', color: 'white' }} defaultValue={selectedRequest.appointment_date} required />
                </div>
                <div className="ar-form-group">
                   <label className="ar-form-label">AI Recommended Slots</label>
                   <div className="ar-quick-slots g-2">
                      <button type="button" className="ar-slot-btn" style={{ borderColor: '#333', color: '#888' }}>Tomorrow 09:00 AM</button>
                      <button type="button" className="ar-slot-btn" style={{ borderColor: '#333', color: '#888' }}>Friday 11:30 AM</button>
                   </div>
                </div>
                <div className="ar-modal-footer border-0 p-0 mt-3 d-flex gap-2">
                   <button type="button" className="ar-btn-outline flex-1" onClick={() => setShowReschedule(false)}>Cancel</button>
                   <button type="submit" className="ar-btn-primary flex-1">Propose Change</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarStat = ({ label, value, color }) => (
  <div className="ar-sidebar-stat">
    <div className="ar-stat-point" style={{ backgroundColor: color }}></div>
    <div className="ar-stat-info">
      <span className="ar-stat-label">{label}</span>
      <span className="ar-stat-val">{value}</span>
    </div>
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
            <span className="ar-p-id">CASREF: #{req.id.toString().substring(0, 8).toUpperCase()}</span>
          </div>
        </div>
        <div className="ar-time-badge">
           <Clock size={14} /> {dateStr} • {formatTime(req.appointment_time)}
        </div>
      </div>

      <div className="ar-card-metadata">
        <div className="ar-meta-item">
          <Stethoscope size={14} /> {req.consultation_type || 'General'}
        </div>
        <div className="ar-meta-item">
           <Activity size={14} /> {urgent ? "URGENT" : "Routine"}
        </div>
      </div>

      <p className="ar-symptoms-preview">
        <strong>Complaint:</strong> {req.reason || "Patient requested initial triage."}
      </p>

      <div className="ar-card-actions">
        <button className="ar-btn-primary flex-grow-1" onClick={() => onAction(req.id, "approve")} disabled={!!actionLoading}>
           {actionLoading === req.id + "approve" ? <RefreshCw className="ar-spin" size={16} /> : "Approve Case"}
        </button>
        <button className="ar-btn-outline" onClick={onReschedule}>Reschedule</button>
        <button className="ar-btn-danger-soft" onClick={() => onAction(req.id, "reject")} disabled={!!actionLoading}>
           <X size={20} />
        </button>
      </div>
    </div>
  );
};

const formatTime = (time) => {
  if (!time) return "N/A";
  const [h, m] = time.split(":");
  const hh = parseInt(h);
  return `${((hh + 11) % 12 + 1)}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const formatDate = (date) => new Date(date).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

const isUrgent = (date) => {
  if (!date) return false;
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
};

export default AppointmentRequests;
