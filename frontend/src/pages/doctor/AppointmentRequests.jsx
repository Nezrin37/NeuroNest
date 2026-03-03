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
  const [approved, setApproved]       = useState([]);
  const [rejected, setRejected]       = useState([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const [filterMode, setFilterMode]   = useState("All"); // All, Urgent, Recent
  const { isDark }                    = useTheme();

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
        setApproved(prev => [...prev, id]);
      } else {
        await rejectAppointment(id);
        setRejected(prev => [...prev, id]);
      }
      setTimeout(() => {
        setRequests(prev => prev.filter(r => r.id !== id));
        setApproved(prev => prev.filter(a => a !== id));
        setRejected(prev => prev.filter(r => r !== id));
      }, 700);
    } catch (err) {
      console.error(`Error ${action}ing:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hn = Number(h);
    if (isNaN(hn)) return t.substring(0, 5);
    return `${hn % 12 || 12}:${m} ${hn >= 12 ? "PM" : "AM"}`;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });

  const getInitials = (name = "") =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const avatarColors = [
    ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#be185d"], ["#dcfce7", "#15803d"],
    ["#fef3c7", "#b45309"], ["#ede9fe", "#7c3aed"], ["#ffedd5", "#c2410c"],
  ];

  const getAvatarColor = (name = "") => {
    const idx = (name.charCodeAt(0) || 0) % avatarColors.length;
    return avatarColors[idx];
  };

  const isUrgent = (dateStr) => {
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 2;
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`ar-page container-fluid py-4 min-vh-100 ${isDark ? 'dark' : ''}`}>
         <div className="ar-main-content">
            <div className="ar-skeleton-header mb-4" style={{ height: '200px' }}></div>
            <div className="row g-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="col-4">
                  <div className="ar-skeleton-row mb-3" style={{ height: '30px', width: '40%' }}></div>
                  <div className="ar-skeleton-card mb-3" style={{ height: '150px' }}></div>
                  <div className="ar-skeleton-card" style={{ height: '150px' }}></div>
                </div>
              ))}
            </div>
         </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────
  if (requests.length === 0) {
    return (
      <div className={`ar-page container-fluid py-4 min-vh-100 ${isDark ? 'dark' : ''}`}>
        <div className="ar-topbar mb-5">
          <div>
            <h1 className="ar-title">Appointment Requests</h1>
            <p className="ar-subtitle">Manage your patient consultation queue</p>
          </div>
          <button className="ar-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "ar-spin" : ""} />
            Refresh Queue
          </button>
        </div>

        <div className="ar-empty-state">
          <div className="ar-empty-icon-ring">
            <Inbox size={40} strokeWidth={1.5} />
          </div>
          <h3>Dashboard Synced</h3>
          <p>No new appointment requests at the moment. We'll alert you when a patient initiates a booking.</p>
          <button className="ar-btn-approve shadow-none mt-3" style={{ maxWidth: '200px' }} onClick={handleRefresh}>
            <RefreshCw size={16} /> Check for Updates
          </button>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (req.reason && req.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterMode === "Urgent") return matchesSearch && isUrgent(req.appointment_date);
    return matchesSearch;
  });

  const pendingRequests = filteredRequests.filter(r => !isUrgent(r.appointment_date));
  const urgentCases     = filteredRequests.filter(r => isUrgent(r.appointment_date));

  return (
    <div className={`ar-page ${isDark ? 'dark' : ''}`}>
      
      {/* ── Top Analytics Row (Clean Cards) ── */}
      <div className="ar-stats-row">
         <StatCard title="Active Requests" value={requests.length} icon={<Layers size={20} />} color="#3b82f6" bg="#eff6ff" />
         <StatCard title="Critical Cases" value={urgentCases.length} icon={<AlertCircle size={20} />} color="#ef4444" bg="#fef2f2" />
         <StatCard title="Auto-Scheduled" value="98%" icon={<CheckCircle2 size={20} />} color="#10b981" bg="#ecfdf5" />
         <StatCard title="Today's Load" value="6" icon={<Calendar size={20} />} color="#8b5cf6" bg="#f5f3ff" />
      </div>

      <div className="ar-layout-grid">
         
         {/* ── Main Content (70%) ── */}
         <div className="ar-main-col">
            
            {/* Urgent Cases Section */}
            <div className="ar-section">
               <div className="ar-section-header">
                  <h2 className="ar-section-title">
                     <TrendingUp size={20} className="text-danger" />
                     Urgent Cases
                  </h2>
                  <span className="ar-section-count">{urgentCases.length}</span>
               </div>
               
               <div className="ar-list-stack">
                  {urgentCases.map(req => (
                     <RequestCard key={req.id} req={req} onAction={handleAction} actionLoading={actionLoading} />
                  ))}
                  {urgentCases.length === 0 && (
                     <div className="ar-empty-state py-4" style={{ background: 'transparent', borderStyle: 'dashed' }}>
                        <p className="small text-muted">All critical requests cleared.</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Pending Requests Section */}
            <div className="ar-section">
               <div className="ar-section-header">
                  <h2 className="ar-section-title">
                     <Inbox size={20} className="text-primary" />
                     Pending Requests
                  </h2>
                  <span className="ar-section-count">{pendingRequests.length}</span>
               </div>

               <div className="ar-list-stack">
                  {pendingRequests.map(req => (
                     <RequestCard key={req.id} req={req} onAction={handleAction} actionLoading={actionLoading} />
                  ))}
                  {pendingRequests.length === 0 && (
                     <div className="ar-empty-state py-4" style={{ background: 'transparent', borderStyle: 'dashed' }}>
                        <p className="small text-muted">No pending intake requests.</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Scheduled Follow-ups (Mock Section) */}
            <div className="ar-section">
               <div className="ar-section-header">
                  <h2 className="ar-section-title">
                     <MessageCircle size={20} className="text-purple-500" />
                     Scheduled Follow-ups
                  </h2>
                  <span className="ar-section-count">0</span>
               </div>
               <div className="ar-empty-state py-5" style={{ background: 'transparent', border: '1.5px dashed #e2e8f0' }}>
                  <span className="text-muted small">No follow-ups requiring immediate triage.</span>
               </div>
            </div>

         </div>

         {/* ── Right Panel (30%) ── */}
         <div className="ar-sidebar-col">
            
            <div className="ar-insight-card">
               <div className="ar-ai-header">
                  <Activity size={16} />
                  AI Clinical Insights
               </div>
               
               <div className="ar-insight-body">
                  <div className="d-flex justify-content-between mb-1">
                     <span className="small fw-bold">Current Capacity</span>
                     <span className="small fw-bold text-primary">71%</span>
                  </div>
                  <div className="ar-cap-meter">
                     <div className="ar-cap-fill" style={{ width: '71%' }}></div>
                  </div>
               </div>

               <div className="ar-insight-msg">
                  <Star size={14} className="text-warning me-1" />
                  Capacity peak estimated at <strong>3:00 PM</strong>. Suggest move Patient #219 to morning slot for better clinical workflow.
               </div>

               <div className="ar-chart-placeholder" style={{ height: '80px', background: 'transparent' }}>
                  <BarChart3 size={24} className="text-muted opacity-25" />
               </div>
            </div>

            <div className="ar-widget">
               <h3 className="ar-widget-title">Burnout Alert</h3>
               <div className="d-flex align-items-center gap-3">
                  <div className="bg-success-subtle rounded-circle p-2">
                     <Activity size={20} className="text-success" />
                  </div>
                  <div className="small text-muted">Clinical load is optimal. Risk of burnout: Low.</div>
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
               </div>
            </div>

         </div>

      </div>

    </div>
  );
};

// ── Sub-components ───────────────────────────────────────

const StatCard = ({ title, value, icon, color, bg }) => (
   <div className="ar-stat-card">
      <div className="ar-stat-header">
         <div className="ar-stat-icon-box" style={{ backgroundColor: bg, color: color }}>
            {icon}
         </div>
         <span className="ar-stat-title">{title}</span>
      </div>
      <div className="ar-stat-value">{value}</div>
   </div>
);

const RequestCard = ({ req, onAction, actionLoading }) => {
   const urgent = isUrgent(req.appointment_date);
   const dateStr = new Date(req.appointment_date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
   
   return (
      <div className={`ar-card ${urgent ? 'ar-card-urgent' : 'ar-card-active'} mb-3`}>
         <div className="ar-card-header">
            <div className="ar-patient-badge">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.patient_name}`} alt="" className="ar-p-avatar" />
               <div className="ar-p-info">
                  <div className="ar-p-name">{req.patient_name}</div>
                  <div className="ar-requested-on small text-muted">Request ID: #{req.id.toString().substring(0, 5)}</div>
               </div>
            </div>
            <div className="ar-time-tag">
               <Clock size={12} className="me-1" />
               {dateStr} • {formatTime(req.appointment_time)}
            </div>
         </div>

         <div className="ar-card-body">
            <h4 className="ar-complaint">
               {req.reason || "General Consultation"}
               {urgent && <span className="ms-2 badge bg-danger-subtle text-danger" style={{ fontSize: '0.65rem' }}>URGENT</span>}
            </h4>
            <div className="ar-meta-info">
               <span>Initial Consult</span>
               <span>•</span>
               <span>Duration: 30m</span>
               <span>•</span>
               <span className="text-primary fw-bold">Online</span>
            </div>
         </div>

         <div className="ar-card-actions">
            <button className="ar-btn-action ar-btn-primary" onClick={() => onAction(req.id, "approve")} disabled={!!actionLoading}>
               {actionLoading === req.id + "approve" ? <RefreshCw className="ar-spin" size={14} /> : <Check size={14} />}
               Accept
            </button>
            <button className="ar-btn-action ar-btn-outline">
               <RefreshCw size={14} />
               Reschedule
            </button>
            <button className="ar-btn-action ar-btn-danger" onClick={() => onAction(req.id, "reject")} disabled={!!actionLoading}>
               <X size={14} />
               Reject
            </button>
         </div>
      </div>
   );
};

// ── Utilites ───────────────────────────────────────────────
const formatTime = (time) => {
   if (!time) return "N/A";
   const [h, m] = time.split(":");
   const hh = parseInt(h);
   const suffix = hh >= 12 ? "PM" : "AM";
   return `${((hh + 11) % 12 + 1)}:${m} ${suffix}`;
};

const isUrgent = (date) => {
   if (!date) return false;
   const d = new Date(date);
   const diffDays = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
   return diffDays >= 0 && diffDays <= 2;
};

export default AppointmentRequests;
