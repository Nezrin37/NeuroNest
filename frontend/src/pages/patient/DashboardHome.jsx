import React, { useState, useEffect, useRef } from "react";
import { Activity, Calendar, Heart, TrendingUp, ShieldCheck, Clock, Bell, X, Wifi, WifiOff, Thermometer, Droplets } from "lucide-react";
import { getMyNotifications, markNotificationRead } from "../../api/profileApi";
import { Link } from "react-router-dom";

const BACKEND_API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── ECG Waveform ───────────────────────────────────────────────
function ECGWave({ bpm, color, height = 56 }) {
  const W = 600, cycles = 3, cw = W / cycles;
  const mid = height / 2, amp = height * 0.38;

  function ecgCycle(sx) {
    const t = f => sx + f * cw;
    const y = v => mid - v * amp;
    return [
      [t(0.00), y(0)], [t(0.10), y(0)],
      [t(0.13), y(0.15)], [t(0.16), y(0.25)], [t(0.19), y(0.15)],
      [t(0.22), y(0)], [t(0.30), y(0)],
      [t(0.35), y(-0.15)], [t(0.38), y(1.0)], [t(0.41), y(-0.28)],
      [t(0.46), y(0)], [t(0.52), y(0)],
      [t(0.58), y(0.08)], [t(0.65), y(0.38)],
      [t(0.72), y(0.38)], [t(0.79), y(0.08)],
      [t(1.00), y(0)],
    ];
  }

  let pts = [];
  for (let i = 0; i < cycles; i++) pts = pts.concat(ecgCycle(i * cw));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const dur = `${(60 / (bpm || 72)) * cycles}s`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
      width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <filter id="ecgGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="65%" stopColor="transparent" />
          <stop offset="85%" stopColor={color} stopOpacity="0.2" />
          <stop offset="94%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {[...Array(4)].map((_, i) => (
        <line key={`h${i}`} x1="0" y1={(height / 3) * i} x2={W} y2={(height / 3) * i}
          stroke={color} strokeWidth="0.5" opacity="0.12" />
      ))}
      {[...Array(7)].map((_, i) => (
        <line key={`v${i}`} x1={(W / 6) * i} y1="0" x2={(W / 6) * i} y2={height}
          stroke={color} strokeWidth="0.5" opacity="0.12" />
      ))}
      <line x1="0" y1={mid} x2={W} y2={mid} stroke={color} strokeWidth="0.8" opacity="0.18" />
      <path d={d} fill="none" stroke={color} strokeWidth="3" opacity="0.15"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#ecgGlow)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <rect x="0" y="0" width={W} height={height} fill="url(#scanGrad)">
        <animateTransform attributeName="transform" type="translate"
          from={`-${W} 0`} to={`${W} 0`} dur={dur} repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

// ── Pleth Wave ─────────────────────────────────────────────────
function PlethWave({ color, height = 56 }) {
  const W = 600, cycles = 4, cw = W / cycles;
  const mid = height * 0.55, amp = height * 0.35;

  function pleth(sx) {
    const t = f => sx + f * cw, y = v => mid - v * amp;
    return [
      [t(0.00), y(0)], [t(0.12), y(0)], [t(0.22), y(0.35)],
      [t(0.30), y(0.92)], [t(0.35), y(1.0)], [t(0.40), y(0.82)],
      [t(0.46), y(0.48)], [t(0.52), y(0.28)], [t(0.58), y(0.14)],
      [t(0.65), y(0.04)], [t(1.00), y(0)],
    ];
  }

  let pts = [];
  for (let i = 0; i < cycles; i++) pts = pts.concat(pleth(i * cw));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
      width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="plethFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...Array(4)].map((_, i) => (
        <line key={i} x1="0" y1={(height / 3) * i} x2={W} y2={(height / 3) * i}
          stroke={color} strokeWidth="0.5" opacity="0.12" />
      ))}
      <path d={`${d} L${W},${height} L0,${height} Z`} fill="url(#plethFill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

// ── Temp Sparkline ─────────────────────────────────────────────
function TempSparkline({ history, color, height = 56 }) {
  if (!history || history.length < 2) return (
    <svg width="100%" height={height}>
      <line x1="0" y1={height / 2} x2="100%" y2={height / 2}
        stroke={color} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.25" />
    </svg>
  );
  const W = 600;
  const min = Math.min(...history) - 0.3, max = Math.max(...history) + 0.3;
  const rng = max - min || 1;
  const pts = history.map((v, i) => [
    (i / (history.length - 1)) * W,
    height - ((v - min) / rng) * (height - 8) - 4,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
      width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...Array(4)].map((_, i) => (
        <line key={i} x1="0" y1={(height / 3) * i} x2={W} y2={(height / 3) * i}
          stroke={color} strokeWidth="0.5" opacity="0.12" />
      ))}
      <path d={`${d} L${W},${height} L0,${height} Z`} fill="url(#tempFill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]}
        r="3.5" fill={color} opacity="0.9" />
    </svg>
  );
}

// ── Vitals Section ─────────────────────────────────────────────
function VitalsSection() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState(false);
  const timer = useRef();

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [lr, hr] = await Promise.all([
          fetch(`${BACKEND_API}/api/vitals/latest`, { headers: { Authorization: `Bearer ${localStorage.getItem("neuronest_token")}` } }),
          fetch(`${BACKEND_API}/api/vitals/history`, { headers: { Authorization: `Bearer ${localStorage.getItem("neuronest_token")}` } }),
        ]);
        setData(await lr.json());
        setHistory(await hr.json());
        setOnline(true);
      } catch { setOnline(false); }
    };
    fetch_();
    timer.current = setInterval(fetch_, 1000);
    return () => clearInterval(timer.current);
  }, []);

  const tempHistory = history.map(h => h.temp).filter(Boolean);
  const signal = data?.signal || "na";
  const isLive = signal === "ok";
  const isWeak = signal === "weak";
  const anyAlert = data && !!(data.hr_alert || data.spo2_alert || data.temp_alert);

  const vitals = [
    {
      label: "Heart Rate",
      value: data?.hr ?? null,
      unit: "BPM",
      normal: "50–120 BPM",
      alert: !!data?.hr_alert,
      color: "#dc3545",
      bsColor: "danger",
      icon: <Heart size={25} />,
      wave: "ecg",
      decimals: 0,
    },
    {
      label: "SpO₂ Measurement",
      value: data?.spo2 ?? null,
      unit: "%",
      normal: "90–100%",
      alert: !!data?.spo2_alert,
      color: "#0d6efd",
      bsColor: "primary",
      icon: <Droplets size={25} />,
      wave: "pleth",
      decimals: 0,
    },
    {
      label: "Body Temperature",
      value: data?.temp ?? null,
      unit: "°C",
      normal: "34.5–37.2°C",
      alert: !!data?.temp_alert,
      color: "#198754",
      bsColor: "success",
      icon: <Thermometer size={25} />,
      wave: "temp",
      decimals: 2,
    },
  ];

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h5 fw-black text-dark mb-0">Live Vitals Monitor</h2>
          <p className="small text-secondary mb-0">
            Real-time readings from your ESP32 device
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {/* Device status */}
          {online ? (
            <span className="badge rounded-pill d-flex align-items-center gap-1"
              style={{ background: "#d1fae5", color: "#065f46", fontSize: "0.7rem" }}>
              <Wifi size={10} /> Connected
            </span>
          ) : (
            <span className="badge rounded-pill d-flex align-items-center gap-1"
              style={{ background: "#fee2e2", color: "#991b1b", fontSize: "0.7rem" }}>
              <WifiOff size={10} /> Device Offline
            </span>
          )}
          {/* Signal status */}
          {isLive && (
            <span className="badge rounded-pill bg-success" style={{ fontSize: "0.7rem" }}>
              ● LIVE
            </span>
          )}
          {isWeak && (
            <span className="badge rounded-pill bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
              ◐ WEAK SIGNAL
            </span>
          )}
          {signal === "no_finger" && (
            <span className="badge rounded-pill bg-danger" style={{ fontSize: "0.7rem" }}>
              ○ NO FINGER
            </span>
          )}
          {signal === "initialising" && (
            <span className="badge rounded-pill bg-info" style={{ fontSize: "0.7rem" }}>
              ◌ INITIALISING
            </span>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {anyAlert && (
        <div className="alert alert-danger d-flex align-items-center gap-2 rounded-4 mb-3 py-2 px-3 border-0"
          style={{ background: "#fff1f2", color: "#be123c" }}>
          <span style={{ fontSize: "1rem" }}>🚨</span>
          <span className="fw-bold small">
            Abnormal vitals detected — please consult your doctor immediately.
          </span>
        </div>
      )}

      {/* Vitals Cards */}
      <div className="row g-4">
        {vitals.map((v, i) => {
          const fmt = v.value != null ? v.value.toFixed(v.decimals) : "--";
          return (
            <div key={i} className="col-12 col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden hover-translate-y"
                style={{
                  background: v.alert ? "#fff5f5" : "white",
                  border: v.alert ? "1px solid rgba(220,53,69,0.3) !important" : undefined,
                  transition: "all 0.3s",
                }}>

                {/* Alert strip */}
                {v.alert && (
                  <div style={{
                    height: 3,
                    background: `linear-gradient(90deg, transparent, ${v.color}, transparent)`,
                    animation: "stripPulse 1.5s ease-in-out infinite",
                  }} />
                )}

                <div className="card-body p-4">
                  {/* Top row */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="small fw-bold text-uppercase text-secondary mb-0"
                        style={{ fontSize: "0.9rem", letterSpacing: "1px" }}>
                        {v.label}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "#bbb", letterSpacing: "1px" }}>
                        {v.sub}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {v.alert && (
                        <span className="badge bg-danger rounded-pill"
                          style={{ fontSize: "0.58rem", animation: "blink 0.9s step-end infinite" }}>
                          ⚠ ALERT
                        </span>
                      )}
                      <div className={`bg-${v.bsColor} bg-opacity-10 text-${v.bsColor} p-2 rounded-3`}>
                        {v.icon}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="d-flex align-items-baseline gap-1 mb-2">
                    <span className="fw-black"
                      style={{
                        fontSize: "3rem",
                        lineHeight: 1,
                        color: v.alert ? "#dc3545" : v.color,
                        fontVariantNumeric: "tabular-nums",
                        transition: "color 0.3s",
                        letterSpacing: "-1px",
                      }}>
                      {fmt}
                    </span>
                    <span className="text-secondary fw-bold" style={{ fontSize: "0.85rem" }}>
                      {v.unit}
                    </span>
                  </div>

                  {/* Waveform */}
                  <div style={{
                    background: v.alert
                      ? `rgba(220,53,69,0.04)`
                      : `rgba(${v.bsColor === "danger" ? "220,53,69" : v.bsColor === "primary" ? "13,110,253" : "25,135,84"},0.04)`,
                    borderRadius: 10,
                    overflow: "hidden",
                    padding: "4px 2px",
                    marginBottom: 8,
                  }}>
                    {v.wave === "ecg" && (
                      <ECGWave bpm={data?.hr || 72} color={v.alert ? "#dc3545" : v.color} />
                    )}
                    {v.wave === "pleth" && (
                      <PlethWave color={v.alert ? "#dc3545" : v.color} />
                    )}
                    {v.wave === "temp" && (
                      <TempSparkline history={tempHistory} color={v.alert ? "#dc3545" : v.color} />
                    )}
                  </div>

                  {/* Footer */}
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-secondary" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>
                      NORMAL: {v.normal}
                    </span>
                    <span className={`badge rounded-pill bg-${v.bsColor} bg-opacity-10 text-${v.bsColor}`}
                      style={{ fontSize: "0.6rem" }}>
                      {isLive ? "● LIVE" : isWeak ? "◐ LKG" : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes stripPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
      `}</style>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
const DashboardHome = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getMyNotifications(true);
        setNotifications(data || []);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const stats = [
    { label: "Health Score", value: "94/100", icon: <Heart size={20} />, color: "danger", trend: "+2%" },
    { label: "Active Plans", value: "3", icon: <Activity size={20} />, color: "primary", trend: "On track" },
    { label: "Next Checkup", value: "In 4 Days", icon: <Calendar size={20} />, color: "success", trend: "Scheduled" },
  ];

  return (
    <div className="py-2">

      {/* Welcome Banner */}
      <div className="card border-0 rounded-4 overflow-hidden mb-5 shadow-sm"
        style={{ background: "linear-gradient(135deg, #0d6efd, #6610f2)" }}>
        <div className="card-body p-3 p-md-4 text-white position-relative">
          <div className="position-relative z-1">
            <h1 className="display-6 fw-black mb-2" style={{ letterSpacing: "-1px" }}>
              Welcome back, Jane 👋
            </h1>
            <p className="lead opacity-75 mb-3 fw-medium">
              Your health journey is progressing beautifully. Here's your overview for today.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <button className="btn btn-white rounded-pill px-4 fw-bold shadow-sm border-0">
                View Health Report
              </button>
              <button className="btn btn-outline-light rounded-pill px-4 fw-bold">
                Emergency SOS
              </button>
            </div>
          </div>
          <div className="position-absolute top-0 end-0 opacity-10 p-5 d-none d-lg-block">
            <Activity size={200} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* ✅ LIVE VITALS — between banner and stats */}
      <VitalsSection />

      {/* Quick Stats */}
      <div className="row g-4 mb-5">
        {stats.map((stat, i) => (
          <div key={i} className="col-12 col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 hover-translate-y">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} p-3 rounded-4`}>
                    {stat.icon}
                  </div>
                  <span className="badge rounded-pill bg-light text-secondary small fw-bold px-2 py-1">
                    {stat.trend}
                  </span>
                </div>
                <div className="small fw-bold text-uppercase text-secondary mb-1"
                  style={{ fontSize: "0.7rem", letterSpacing: "1px" }}>
                  {stat.label}
                </div>
                <div className="h3 fw-black text-dark mb-0">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Summary + Alerts */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h5 fw-black text-dark mb-0">Health Summary</h2>
                <button className="btn btn-link text-primary text-decoration-none fw-bold p-0">
                  Detailed Analysis
                </button>
              </div>
              <div className="p-5 text-center bg-light rounded-4 border border-dashed text-secondary">
                <TrendingUp size={48} className="mb-3 opacity-25" />
                <h3 className="h6 fw-bold mb-1">Vitality Metrics Loading...</h3>
                <p className="small mb-0">
                  We're synchronizing your latest clinic results from the South Sector lab.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <h2 className="h5 fw-black text-dark mb-4">Reminders & Alerts</h2>
              <div className="d-flex flex-column gap-3">
                {notifications.length > 0 ? (
                  notifications.map(n => {
                    const isUrgent = n.message.toLowerCase().includes("urgent") ||
                      n.message.toLowerCase().includes("priority");
                    const isActionRequired = n.type === "appointment_rescheduled";
                    return (
                      <div key={n.id}
                        className={`d-flex gap-3 align-items-start p-3 rounded-4 border-start border-4 ${isUrgent ? "bg-danger bg-opacity-10 border-danger" : isActionRequired ? "bg-warning bg-opacity-10 border-warning" : "bg-primary bg-opacity-10 border-primary"}`}>
                        {isUrgent
                          ? <ShieldCheck size={20} className="text-danger mt-1" />
                          : isActionRequired
                            ? <Clock size={20} className="text-warning mt-1" />
                            : <Bell size={20} className="text-primary mt-1" />}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between">
                            <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                              {n.title}
                              {isUrgent && (
                                <span className="badge bg-danger rounded-pill" style={{ fontSize: "0.6rem" }}>
                                  PRIORITY
                                </span>
                              )}
                            </div>
                            <button onClick={() => handleMarkRead(n.id)}
                              className="btn btn-link p-0 text-muted" title="Dismiss">
                              <X size={14} />
                            </button>
                          </div>
                          <p className="small text-secondary mb-2 lh-sm">{n.message}</p>
                          {isActionRequired && (
                            <Link to="/patient/appointments"
                              className="btn btn-warning btn-sm py-0 px-2 rounded-pill fw-bold"
                              style={{ fontSize: "0.7rem" }}>
                              Review New Time
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="d-flex gap-3 align-items-start p-3 rounded-4 bg-primary bg-opacity-10 border-start border-4 border-primary">
                      <ShieldCheck size={20} className="text-primary mt-1" />
                      <div>
                        <div className="fw-bold small text-dark">Insurance Verified</div>
                        <p className="small text-secondary mb-0">
                          Your medical coverage has been updated for the 2026 term.
                        </p>
                      </div>
                    </div>
                    <div className="d-flex gap-3 align-items-start p-3 rounded-4 bg-light">
                      <Calendar size={20} className="text-secondary mt-1" />
                      <div>
                        <div className="fw-bold small text-dark text-muted">No recent alerts</div>
                        <p className="small text-secondary mb-0 opacity-50">
                          You're all caught up with your notifications.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .btn-white { background: white; color: #0d6efd; }
        .btn-white:hover { background: #f8f9fa; transform: scale(1.05); }
        .fw-black { font-weight: 950; }
        .hover-translate-y { transition: transform 0.2s; }
        .hover-translate-y:hover { transform: translateY(-4px); }
        .border-dashed { border-style: dashed !important; }
      `}</style>
    </div>
  );
};

export default DashboardHome;
