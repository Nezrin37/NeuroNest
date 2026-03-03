import { useState, useEffect } from "react";
import { getAppointmentRequests, approveAppointment, rejectAppointment } from "../../api/doctor";
import {
  Check, X, Clock, Calendar, MessageSquare,
  CheckCircle2, XCircle, Inbox, RefreshCw,
  Stethoscope, AlertCircle, ChevronRight,
  TrendingUp, Users, Activity
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
        <div className="ar-topbar mb-4">
          <div className="ar-skeleton-header w-50"></div>
          <div className="ar-skeleton-header w-25"></div>
        </div>
        <div className="ar-stats-strip mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="ar-stat-item ar-skeleton-row" style={{height: 60}}></div>
          ))}
        </div>
        <div className="ar-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="ar-skeleton-card">
              <div className="d-flex gap-3 mb-3">
                <div className="ar-skeleton-row ar-sk-avatar"></div>
                <div className="flex-grow-1 d-flex flex-column gap-2">
                  <div className="ar-skeleton-row ar-sk-line"></div>
                  <div className="ar-skeleton-row ar-sk-line-sm"></div>
                </div>
              </div>
              <div className="ar-skeleton-row ar-sk-bar" style={{height: 100}}></div>
              <div className="ar-skeleton-row ar-sk-bar"></div>
            </div>
          ))}
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
  return (
    <div className={`ar-page container-fluid py-4 min-vh-100 ${isDark ? 'dark' : ''}`}>

      {/* ── Top Bar ── */}
      <div className="ar-topbar mb-2">
        <div>
          <h1 className="ar-title">Appointment Requests</h1>
          <p className="ar-subtitle">Verify and authorize patient bookings</p>
        </div>
        <div className="ar-topbar-right">
          <div className="ar-count-pill">
            <div className="ar-count-dot"></div>
            {requests.length} LIVE REQUESTS
          </div>
          <button className="ar-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "ar-spin" : ""} />
            Sync
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="ar-stats-strip mb-4">
        <div className="ar-stat-item">
          <div className="ar-stat-icon ar-stat-icon-amber">
            <Clock size={22} />
          </div>
          <div>
            <div className="ar-stat-num">{requests.length}</div>
            <div className="ar-stat-label text-uppercase">Waitlist</div>
          </div>
        </div>
        
        <div className="ar-stat-divider d-none d-md-block"></div>

        <div className="ar-stat-item">
          <div className="ar-stat-icon ar-stat-icon-red">
            <Activity size={22} />
          </div>
          <div>
            <div className="ar-stat-num">
              {requests.filter(r => isUrgent(r.appointment_date)).length}
            </div>
            <div className="ar-stat-label text-uppercase">Critical</div>
          </div>
        </div>
        
        <div className="ar-stat-divider d-none d-md-block"></div>

        <div className="ar-stat-item">
          <div className="ar-stat-icon ar-stat-icon-blue">
            <Users size={22} />
          </div>
          <div>
            <div className="ar-stat-num">
              {new Set(requests.map(r => r.patient_name)).size}
            </div>
            <div className="ar-stat-label text-uppercase">Patients</div>
          </div>
        </div>
      </div>

      {/* ── Cards Grid ── */}
      <div className="ar-grid">
        {requests.map((req) => {
          const [bg, fg] = getAvatarColor(req.patient_name);
          const urgent = isUrgent(req.appointment_date);
          const isApproved = approved.includes(req.id);
          const isRejected = rejected.includes(req.id);
          
          let cardClass = "ar-card";
          if (urgent) cardClass += " ar-card-urgent";
          if (isApproved) cardClass += " ar-card-approved";
          if (isRejected) cardClass += " ar-card-rejected";

          return (
            <div key={req.id} className={cardClass}>
                
                {urgent && !isApproved && !isRejected && (
                  <div className="ar-urgent-ribbon">
                    <TrendingUp size={12} /> High Priority
                  </div>
                )}

                <div className="ar-card-header">
                  <div className="ar-patient-row">
                      <div className="ar-avatar" style={{ background: bg, color: fg }}>
                          {getInitials(req.patient_name)}
                      </div>
                      <div className="ar-patient-info text-truncate">
                          <h3 className="ar-patient-name">{req.patient_name}</h3>
                          <div className="ar-requested-on">
                              UID: {req.id.toString().substring(0, 8)} • {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                      </div>
                  </div>
                  {!urgent && !isApproved && !isRejected && (
                    <div className="ar-badge-pending">
                      <div className="ar-badge-dot"></div>
                      Queue
                    </div>
                  )}
                </div>

                <div className="ar-details">
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="ar-detail-row">
                          <div className="ar-detail-icon"><Calendar size={14}/></div>
                          <span>{formatDate(req.appointment_date)}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="ar-detail-row">
                          <div className="ar-detail-icon"><Clock size={14}/></div>
                          <span>{formatTime(req.appointment_time)}</span>
                      </div>
                    </div>
                  </div>

                  {req.reason && (
                      <div className="ar-reason-box mt-1">
                          <span className="ar-reason-label">
                              <MessageSquare size={10} /> Clinical Reason
                          </span>
                          <p className="ar-reason-text">{req.reason}</p>
                      </div>
                  )}
                  {req.notes && (
                      <div className="ar-notes-text mt-1">
                          <ChevronRight size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{req.notes}</span>
                      </div>
                  )}
                </div>

                <div className="ar-actions">
                    <button
                      className="ar-btn-approve"
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === req.id + "approve" || isApproved ? (
                          <CheckCircle2 size={18} className={isApproved ? "animate-pulse" : ""} />
                      ) : (
                          <Check size={18} />
                      )}
                      {isApproved ? "Confirmed" : "Approve Booking"}
                    </button>
                    
                    <button
                      className="ar-btn-reject"
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={!!actionLoading}
                      title="Decline request"
                    >
                      {isRejected ? <XCircle size={18} /> : <X size={18} />}
                    </button>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AppointmentRequests;
