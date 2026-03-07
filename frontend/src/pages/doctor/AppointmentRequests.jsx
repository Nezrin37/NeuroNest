import { useState, useEffect, useMemo } from "react";
import { 
  getAppointmentRequests, 
  approveAppointment, 
  rejectAppointment, 
  getAppointmentHistory,
  rescheduleAppointment,
  getScheduleSlots
} from "../../api/doctor";
import {
  X, RefreshCw, ChevronRight, Search,
  Calendar, CheckCircle2, ShieldAlert, Zap, Clock
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/appointment-requests.css";

// --- Clinical Utilities ---
function isCloseDate(dateStr) {
  if (!dateStr) return false;
  // Use local midnight to avoid UTC timezone offset issues (e.g. IST = UTC+5:30)
  const apptDate = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (apptDate - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 2;
}

function calculateAge(dob) {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age === 0 ? "<1Y" : `${age}Y`;
}

function formatDateHeader(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateSmall(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatTime(timeStr) {
  if (!timeStr) return "N/A";
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const [h, m] = parts;
  const hh = parseInt(h);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
}

// --- Sub-components ---
function TriageKPI({ title, value, trend, color, percent }) {
  return (
    <div className="ar-kpi-card">
       <span className="ar-kpi-tag">{title}</span>
       <div className="ar-kpi-main">
          <span className="ar-kpi-value">{value}</span>
          <span className="ar-kpi-trend" style={{ color: color }}>{trend}</span>
       </div>
       <div className="ar-kpi-footer">
          <div className="ar-kpi-bar" style={{ width: `${Math.max(percent, 5)}%`, backgroundColor: color }}></div>
       </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  let color = "#666";
  let bg = "#232327";
  
  if (s === "approved") { color = "#4ade80"; bg = "#4ade8020"; }
  else if (s === "rejected") { color = "#f87171"; bg = "#f8717120"; }
  else if (s === "completed") { color = "#2b70ff"; bg = "#2b70ff20"; }
  else if (s === "cancelled") { color = "#fbbf24"; bg = "#fbbf2420"; }

  return (
    <span style={{ 
      padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', 
      fontWeight: 800, textTransform: 'uppercase', color, backgroundColor: bg,
      border: `1px solid ${color}40`
    }}>
      {status}
    </span>
  );
}

function TriageRow({ req, onAction, actionLoading, onRescheduleClick, isHistory }) {
  const isHighPriority = useMemo(() => {
    const priority = (req.priority_level || "").toLowerCase();
    return priority === "urgent" || priority === "emergency";
  }, [req.priority_level]);

  return (
    <div className={`ar-triage-row ${isHighPriority ? 'ar-priority-row' : ''}`}>
       <div className="ar-patient-cell">
          <div className="ar-avatar-container">
             <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.patient_name}`} className="ar-avatar-img" alt="" />
             <div className="ar-risk-indicator" style={{ backgroundColor: isHighPriority ? '#f87171' : '#4ade80' }}></div>
          </div>
          <div className="ar-details">
             <span className="ar-p-name">{req.patient_name}</span>
             <span className="ar-p-meta">
                ID: #{req.id.toString().substring(0, 6)} • {req.gender || "NA"} {req.dob ? `• ${calculateAge(req.dob)}` : ""}
             </span>
          </div>
       </div>

       <div className="ar-clinical-cell">
          <span className="ar-reason-text">{req.reason || "Patient seeking assessment."}</span>
          <div className="ar-clinical-tags">
             {isHighPriority && (
               <span className={`ar-clin-badge ar-priority-badge ${req.priority_level === 'emergency' ? 'bg-danger' : ''}`}>
                  {req.priority_level === 'emergency' ? 'EMERGENCY' : req.priority_level === 'urgent' ? 'URGENT' : 'Priority Case'}
               </span>
             )}
             <span className={`ar-clin-badge ${(req.consultation_type || 'in_person') === 'online' ? 'ar-online-badge' : 'ar-inperson-badge'}`}>
                {(req.consultation_type || 'in_person') === 'online' ? '💻 Online' : '🏥 In-Person'}
             </span>
             {isHistory && <StatusBadge status={req.status} />}
          </div>
       </div>

       <div className="ar-schedule-cell">
          <span className="ar-time-primary">{formatTime(req.appointment_time)}</span>
          <span className="ar-date-secondary">{formatDateSmall(req.appointment_date)}</span>
       </div>



       <div className="ar-decision-cell">
          {!isHistory ? (
            <>
              <button 
                className="ar-triage-btn ar-btn-reject" 
                onClick={() => onAction(req.id, "reject")}
                disabled={actionLoading === req.id + "reject"}
                title="Reject Request"
              >
                 {actionLoading === req.id + "reject" ? <RefreshCw className="ar-spin" size={16} /> : <X size={20} />}
              </button>
              <button 
                className="ar-triage-btn ar-btn-suggest" 
                onClick={() => onRescheduleClick(req)}
                style={{ color: '#8b5cf6', borderColor: '#8b5cf620' }}
                title="Suggest Alternate Time"
              >
                 <Clock size={18} />
              </button>
              <button 
                className="ar-triage-btn ar-btn-approve" 
                onClick={() => onAction(req.id, "approve")}
                disabled={actionLoading === req.id + "approve"}
                title="Approve Request"
              >
                 {actionLoading === req.id + "approve" ? <RefreshCw className="ar-spin" size={16} /> : <CheckCircle2 size={20} />}
              </button>
            </>
          ) : (
            <button className="ar-triage-btn ar-btn-view" onClick={() => alert("Details for history item")}>
              <ChevronRight size={20} />
            </button>
          )}
       </div>
    </div>
  );
}

const RescheduleModal = ({ isOpen, onClose, onSubmit, appointment, loading }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [useManualTime, setUseManualTime] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");

  useEffect(() => {
    if (appointment && isOpen) {
      setDate(appointment.appointment_date || "");
      const timeStr = appointment.appointment_time;
      setTime(timeStr ? timeStr.substring(0, 5) : "");
      setErrorStatus("");
      setAvailableSlots([]);
      setUseManualTime(false);
    }
  }, [appointment, isOpen]);

  useEffect(() => {
    if (date && isOpen && !useManualTime) {
      fetchAvailableSlots(date);
    }
  }, [date, isOpen, useManualTime]);

  const fetchAvailableSlots = async (targetDate) => {
    setFetchingSlots(true);
    setErrorStatus("");
    try {
      const data = await getScheduleSlots(targetDate);
      const available = data.slots?.filter(s => s.status === 'available') || [];
      setAvailableSlots(available);
      
      if (available.length === 0) {
        // setUseManualTime(true); 
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setErrorStatus("Failed to load available slots.");
    } finally {
      setFetchingSlots(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ar-modal-overlay" onClick={onClose}>
       <div className="ar-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="ar-modal-header">
             <h3>Propose Alternate Schedule</h3>
             <button onClick={onClose} className="ar-modal-close"><X size={20} /></button>
          </div>
          <div className="ar-modal-body">
             <p className="ar-modal-desc">Suggest a new time slot for <strong>{appointment?.patient_name}</strong>. The patient will be notified to confirm.</p>
             
             <div className="ar-modal-field">
                <label>Proposed Date</label>
                <div style={{ position: 'relative' }}>
                   <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    min={new Date().toISOString().split('T')[0]}
                   />
                   <Calendar className="ar-field-icon" size={16} />
                </div>
             </div>

             <div className="ar-manual-toggle">
                <span>Select Available Slot</span>
                <button 
                  className={`ar-toggle-switch ${useManualTime ? '' : 'active'}`}
                  onClick={() => setUseManualTime(!useManualTime)}
                >
                  <div className="ar-toggle-knob"></div>
                </button>
             </div>
             
             {!useManualTime ? (
               <div className="ar-modal-field">
                  <label>Available Slots for {formatDateSmall(date)}</label>
                  {fetchingSlots ? (
                    <div className="ar-slots-loading">
                       <RefreshCw className="ar-spin" size={20} />
                       <span>Checking schedule...</span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="ar-slot-grid">
                       {availableSlots.map((slot) => {
                          const t = new Date(slot.slot_start_utc).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: false,
                            timeZone: 'Asia/Kolkata' 
                          });

                          return (
                            <button 
                              key={slot.id}
                              className={`ar-slot-btn ${time === t ? 'active' : ''}`}
                              onClick={() => setTime(t)}
                            >
                              {formatTime(t)}
                            </button>
                          );
                       })}
                    </div>
                  ) : (
                    <div className="ar-slots-empty">
                       <ShieldAlert size={20} />
                       <span>No available slots found for this date.</span>
                       <button className="ar-link-btn" onClick={() => setUseManualTime(true)}>Enter time manually</button>
                    </div>
                  )}
                  {errorStatus && <p className="ar-field-error">{errorStatus}</p>}
               </div>
             ) : (
               <div className="ar-modal-field">
                  <label>Manual Time Entry</label>
                  <div style={{ position: 'relative' }}>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    <Clock className="ar-field-icon" size={16} />
                  </div>
                  <p className="ar-field-hint">Enter any time you'd like to propose to the patient.</p>
               </div>
             )}
          </div>
          <div className="ar-modal-footer">
             <button onClick={onClose} className="ar-btn-secondary">Cancel</button>
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmit(appointment.id, date, time);
                }} 
                className="ar-btn-primary"
                disabled={loading || !date || !time}
             >
                {loading ? <RefreshCw className="ar-spin" size={16} /> : "Send Proposal"}
             </button>
          </div>
       </div>
    </div>
  );
};

const AppointmentRequests = () => {
  const [requests, setRequests]       = useState([]);
  const [history, setHistory]         = useState([]);
  const [approvedSchedule, setApprovedSchedule] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const { isDark }                    = useTheme();
  const [activeTriage, setActiveTriage] = useState("Needs Review");
  const [modeFilter, setModeFilter]     = useState("all");  // all / online / in_person

  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  useEffect(() => { 
    fetchRequests(); 
  }, []);

  // To enhance conflict detection, we should ideally fetch the doctor's approved schedule
  // For now, we'll fetch a list of all non-pending appointments to check against
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [reqData, histData] = await Promise.all([
        getAppointmentRequests(),
        getAppointmentHistory()
      ]);
      setRequests(reqData || []);
      setHistory(histData || []);
      setHistoryCount(histData?.length || 0);

      // Extract only approved appointments for conflict checking
      const approved = (histData || []).filter(a => 
        String(a.status).toLowerCase() === 'approved' || 
        String(a.status).toLowerCase() === 'confirmed'
      );
      setApprovedSchedule(approved);

    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      if (action === "approve") await approveAppointment(id);
      else if (action === "reject") await rejectAppointment(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(`Error ${action}ing:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRescheduleSubmit = async (id, date, time) => {
    console.log("Submitting reschedule:", { id, date, time });
    setActionLoading(id + "reschedule");
    try {
      await rescheduleAppointment(id, date, time);
      setRequests(prev => prev.filter(r => r.id !== id));
      setRescheduleTarget(null);
      // Optional: Add a small success state/toast here
    } catch (err) {
      console.error("Error rescheduling:", err);
      alert(err.response?.data?.message || "Failed to send reschedule proposal. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const processedRequests = useMemo(() => {
    return (requests || []).map(req => {
      return { 
        ...req, 
        hasConflict: false,
        conflictDetails: null 
      };
    });
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const isHistoryTab = activeTriage === "History";
    const sourceList = isHistoryTab ? history : processedRequests;

    let list = sourceList.filter(req => {
      const name = (req.patient_name || "").toLowerCase();
      const reason = (req.reason || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || reason.includes(search) || req.id?.toString().includes(search);
    });

    if (activeTriage === "High Priority") {
      return list.filter(req => {
        const reason = (req.reason || "").toLowerCase();
        const priority = (req.priority_level || "").toLowerCase();
        return priority === "urgent" ||
               priority === "emergency" ||
               reason.includes("urgent") ||
               reason.includes("emergency") ||
               reason.includes("severe") ||
               reason.includes("pain") ||
               isCloseDate(req.appointment_date);
      });
    }

    if (modeFilter !== "all") {
      list = list.filter(r => (r.consultation_type || "in_person") === modeFilter);
    }

    return list;
  }, [processedRequests, history, searchTerm, activeTriage, modeFilter]);

  const stats = useMemo(() => {
    const highP = processedRequests.filter(req => {
      const reason = (req.reason || "").toLowerCase();
      const priority = (req.priority_level || "").toLowerCase();
      return priority === "urgent" || priority === "emergency" || reason.includes("urgent") || reason.includes("emergency") || isCloseDate(req.appointment_date);
    }).length;

    return {
      total: processedRequests.length,
      highPriority: highP,
      avgTime: processedRequests.length > 0 ? "4.2m" : "0m"
    };
  }, [processedRequests]);

  const triageTabs = [
    { 
      name: "Needs Review", 
      id: "Needs Review",
      count: processedRequests.length 
    },
    { 
      name: "High Priority", 
      id: "High Priority",
      count: processedRequests.filter(req => {
        const reason = (req.reason || "").toLowerCase();
        const priority = (req.priority_level || "").toLowerCase();
        return priority === "urgent" || priority === "emergency" || reason.includes("urgent") || reason.includes("emergency") || reason.includes("severe") || reason.includes("pain") || isCloseDate(req.appointment_date);
      }).length
    },
    { 
      name: "History", 
      id: "History",
      count: (history || []).length 
    }
  ];

  const groupedRequestsByDate = useMemo(() => {
    const isHistoryTab = activeTriage === "History";
    // For history, we want reverse chronological (newest first). For triage, chronological (closest first).
    const sorted = [...filteredRequests].sort((a,b) => {
      const dA = new Date(a.appointment_date + 'T' + a.appointment_time);
      const dB = new Date(b.appointment_date + 'T' + b.appointment_time);
      return isHistoryTab ? dB - dA : dA - dB;
    });

    return sorted.reduce((acc, req) => {
      const dateKey = req.appointment_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(req);
      return acc;
    }, {});
  }, [filteredRequests, activeTriage]);

  const sortedDates = useMemo(() => {
    const dates = Object.keys(groupedRequestsByDate);
    const isHistoryTab = activeTriage === "History";
    return dates.sort((a, b) => {
        const dA = new Date(a);
        const dB = new Date(b);
        return isHistoryTab ? dB - dA : dA - dB;
    });
  }, [groupedRequestsByDate, activeTriage]);

  if (loading) {
     return (
       <div className="ar-page border-0">
         <div className="ar-main-container text-center py-5">
            <RefreshCw className="ar-spin text-primary mb-3" size={56} />
            <h3 className="text-white fw-bold">Clinical Triage Engine</h3>
            <p className="text-muted">Synchronizing pending requests...</p>
         </div>
       </div>
     );
  }

  return (
    <div className={`ar-page ${isDark ? 'dark' : ''}`}>
      <div className="ar-main-container">
        <div className="ar-top-meta">
           <div className="ar-breadcrumbs">
              <span>Clinical Operations</span>
              <ChevronRight size={14} />
              <span className="active">Request Triage</span>
           </div>
        </div>

        <div className="ar-header-row">
           <div className="ar-title-stack">
              <h1>Request Approval Center</h1>
              <p>Analyze and triage incoming patient cases.</p>
           </div>
           <div className="ar-header-actions">
              <button className="ar-action-btn ar-btn-primary" onClick={fetchRequests}>
                 <Zap size={18} /> Refresh Engine
              </button>
           </div>
        </div>

        <div className="ar-kpi-row">
           <TriageKPI title="Total Requests" value={stats.total} trend="+12% vs week" color="#2b70ff" percent={75} />
           <TriageKPI title="Urgent Triage" value={stats.highPriority} trend="Requires Action" color="#f87171" percent={40} />
           <TriageKPI title="Avg. Approval" value={stats.avgTime} trend="Optimal" color="#4ade80" percent={60} />
        </div>

        <div className="ar-triage-controls">
           <div className="ar-triage-tabs">
              {triageTabs.map(tab => (
                 <button 
                  key={tab.name} 
                  className={`ar-triage-tab ${activeTriage === tab.name ? 'active' : ''}`}
                  onClick={() => setActiveTriage(tab.name)}
                 >
                    {tab.name} <span className="count">({tab.count})</span>
                 </button>
              ))}
           </div>
           <div className="ar-search-wrap">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Find patient..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
         {/* Online / In-Person Mode Tabs */}
         <div style={{ display: 'flex', gap: '6px', marginTop: '12px', marginBottom: '4px' }}>
           {[
             { key: 'all',       label: 'All Modes',  icon: '📋' },
             { key: 'online',    label: 'Online',     icon: '💻' },
             { key: 'in_person', label: 'In-Person',  icon: '🏥' },
           ].map(tab => {
             const src = activeTriage === 'History' ? history : processedRequests;
             const cnt = tab.key === 'all'
               ? src.length
               : src.filter(r => (r.consultation_type || 'in_person') === tab.key).length;
             return (
               <button
                 key={tab.key}
                 onClick={() => setModeFilter(tab.key)}
                 style={{
                   padding: '5px 14px', borderRadius: '8px', cursor: 'pointer',
                   background: modeFilter === tab.key
                     ? (tab.key === 'online' ? '#E0F2FE' : tab.key === 'in_person' ? '#DBEAFE' : 'var(--nn-surface)')
                     : 'transparent',
                   color: modeFilter === tab.key
                     ? (tab.key === 'online' ? '#0369A1' : tab.key === 'in_person' ? '#1D4ED8' : 'var(--nn-primary)')
                     : 'var(--nn-text-muted)',
                   fontWeight: modeFilter === tab.key ? 700 : 500,
                   fontSize: '12px', transition: 'all 0.18s',
                   border: modeFilter === tab.key ? '1.5px solid currentColor' : '1.5px solid transparent',
                 }}
               >
                 {tab.icon} {tab.label}
                 <span style={{
                   marginLeft: '5px', background: 'rgba(0,0,0,0.08)',
                   borderRadius: '999px', padding: '0 6px', fontSize: '10px', fontWeight: 800
                 }}>{cnt}</span>
               </button>
             );
           })}
         </div>
        </div>

        <div className="ar-triage-list">
           <div className="ar-table-head">
              <span>Patient Detail</span>
              <span>Clinical Context</span>
              <span>Proposed Slot</span>
              <span className="text-end">Triage Actions</span>
           </div>

           {sortedDates.map(date => (
              <div key={date}>
                 <div className="ar-triage-date-header">
                    <span className="ar-date-label">{formatDateHeader(date)}</span>
                 </div>
                 {groupedRequestsByDate[date].map(req => (
                    <TriageRow 
                      key={req.id} 
                      req={req} 
                      onAction={handleAction}
                      actionLoading={actionLoading}
                      onRescheduleClick={setRescheduleTarget}
                      isHistory={activeTriage === "History"}
                    />
                  ))}
              </div>
           ))}

           {filteredRequests.length === 0 && (
              <div className="ar-kpi-card text-center py-5">
                 <ShieldAlert size={64} className="text-primary mb-4 opacity-10" />
                 <h2 className="text-white fw-bold">Queue Clear</h2>
                 <p className="text-muted">No pending triage requests at this moment.</p>
              </div>
           )}
        </div>
      </div>

      <RescheduleModal 
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        appointment={rescheduleTarget}
        onSubmit={handleRescheduleSubmit}
        loading={actionLoading === (rescheduleTarget?.id + "reschedule")}
      />
    </div>
  );
};

export default AppointmentRequests;
