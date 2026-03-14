import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Calendar,
  ClipboardList,
  Clock,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getDoctorProfile } from '../../services/doctorProfileService';
import { getDoctorStats } from '../../api/doctor';
import '../../styles/dashboard.css';

const ACTIVITY_DATA = [
  { name: 'Mon', active: 40 },
  { name: 'Tue', active: 30 },
  { name: 'Wed', active: 45 },
  { name: 'Thu', active: 50 },
  { name: 'Fri', active: 35 },
  { name: 'Sat', active: 20 },
  { name: 'Sun', active: 15 },
];

const GENERAL_OVERVIEW_DATA = [
  { name: 'Stable', value: 58, color: 'var(--nn-success)' },
  { name: 'Needs Follow-up', value: 27, color: 'var(--nn-warning)' },
  { name: 'Critical Watch', value: 15, color: 'var(--nn-danger)' },
];

const StatCard = ({ label, value, hint, icon, tone = 'primary' }) => (
  <div className={`nn-metric-card nn-tone-${tone}`}>
    <div className="d-flex justify-content-between align-items-start mb-2">
      <div className="nn-stat-label">{label}</div>
      <div className="nn-stat-icon">
        {React.createElement(icon, { size: 16 })}
      </div>
    </div>
    <div>
      <div className="nn-stat-value">{value}</div>
      <div className="nn-stat-hint">{hint}</div>
    </div>
  </div>
);

const TimelineItem = ({ time, patient, status, tone }) => (
  <div className="nn-timeline-item">
    <div className="nn-time">{time}</div>
    <div className="nn-timeline-dot" data-tone={tone} />
    <div className="nn-timeline-body">
      <div className="nn-patient">{patient}</div>
      <div className="nn-status">{status}</div>
    </div>
  </div>
);

const QuickButton = ({ icon, label, onClick }) => (
  <button className="nn-quick-btn" onClick={onClick}>
    {React.createElement(icon, { size: 14 })}
    <span>{label}</span>
    <ArrowRight size={13} />
  </button>
);

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [doctorName, setDoctorName] = useState('Doctor');
  const [stats, setStats] = useState({
    total_patients: 0,
    today_appointments: 0,
    pending_requests: 0,
    active_assessments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, statsData] = await Promise.all([
          getDoctorProfile(),
          getDoctorStats(),
        ]);
        setDoctorName(profileData.full_name || 'Doctor');
        setStats(statsData);
      } catch (err) {
        console.error('Dashboard data fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const loadFactor = useMemo(() => {
    const today = Number(stats.today_appointments || 0);
    if (today === 0) return 0;
    return Math.min(100, Math.round((today / 10) * 100));
  }, [stats.today_appointments]);

  const pendingRatio = useMemo(() => {
    const total = Number(stats.today_appointments || 0) + Number(stats.pending_requests || 0);
    if (!total) return 0;
    return Math.round((Number(stats.pending_requests || 0) / total) * 100);
  }, [stats.today_appointments, stats.pending_requests]);

  if (loading) {
    return (
      <div className="nn-dashboard-wrap d-flex align-items-center justify-content-center">
        <div className="spinner-grow text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nn-dashboard-wrap">
      <section className="nn-dashboard-head">
        <div>
          <h2 className="nn-title">Welcome back, Dr. {doctorName.split(' ').slice(-1)[0]}</h2>
          <p className="nn-subtitle">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · Clinical operations snapshot
          </p>
        </div>
        <div className="nn-head-chip">
          <Activity size={14} />
          <span>System Active</span>
        </div>
      </section>

      <section className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Total Patients"
            value={stats.total_patients}
            hint="Under your care"
            icon={Users}
            tone="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Today's Appointments"
            value={stats.today_appointments}
            hint="Planned sessions"
            icon={Calendar}
            tone="info"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Pending Requests"
            value={stats.pending_requests}
            hint="Awaiting approval"
            icon={AlertTriangle}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Active Assessments"
            value={stats.active_assessments}
            hint="Open clinical reviews"
            icon={ClipboardList}
            tone="success"
          />
        </div>
      </section>

      <section className="row g-4 mb-4">
        <div className="col-12 col-xl-4">
          <div className="nn-panel">
            <div className="nn-panel-head">
              <h3>Quick Actions</h3>
            </div>
            <div className="nn-quick-grid">
              <QuickButton icon={Calendar} label="Today's Schedule" onClick={() => navigate('/doctor/today-schedule')} />
              <QuickButton icon={Clock} label="Appointment Requests" onClick={() => navigate('/doctor/appointment-requests')} />
              <QuickButton icon={Users} label="My Patients" onClick={() => navigate('/doctor/my-patients')} />
              <QuickButton icon={MessageSquare} label="Patient Chat" onClick={() => navigate('/doctor/chat')} />
            </div>
          </div>

          <div className="nn-panel mt-4">
            <div className="nn-panel-head">
              <h3>Today Timeline</h3>
            </div>
            <div className="nn-timeline">
              <TimelineItem time="09:30" patient="Teresa W." status="Neuropathy follow-up" tone="success" />
              <TimelineItem time="11:00" patient="Ivan K." status="Pending reports" tone="warning" />
              <TimelineItem time="14:15" patient="Asha P." status="Cognitive screening" tone="info" />
              <TimelineItem time="17:30" patient="Ravi S." status="Post-op review" tone="danger" />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="nn-panel h-100">
            <div className="nn-panel-head">
              <h3>Patient Dynamic Activity</h3>
              <span className="nn-panel-caption">Last 7 days</span>
            </div>
            <div className="nn-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ACTIVITY_DATA}>
                  <defs>
                    <linearGradient id="nnAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--nn-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--nn-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--nn-text-muted)' }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--nn-border)',
                      background: 'var(--nn-surface)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="var(--nn-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#nnAreaFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="nn-metrics-row">
              <div className="nn-metric-pill">
                <span>Load factor</span>
                <strong>{loadFactor}%</strong>
              </div>
              <div className="nn-metric-pill">
                <span>Pending ratio</span>
                <strong>{pendingRatio}%</strong>
              </div>
              <div className="nn-metric-pill">
                <span>Completed trend</span>
                <strong className="text-success">
                  <CheckCircle2 size={14} /> Stable
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="nn-panel">
            <div className="nn-panel-head">
              <h3>Case Distribution</h3>
            </div>
            <div className="nn-donut-wrap">
              <div className="nn-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={GENERAL_OVERVIEW_DATA}
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {GENERAL_OVERVIEW_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="nn-donut-legend">
                {GENERAL_OVERVIEW_DATA.map((item) => (
                  <div key={item.name} className="nn-legend-row">
                    <span className="nn-legend-dot" style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="nn-panel">
            <div className="nn-panel-head">
              <h3>Operational Notes</h3>
            </div>
            <ul className="nn-notes">
              <li>Review pending appointment approvals before end of day.</li>
              <li>Complete assessment summaries for unresolved follow-ups.</li>
              <li>Use Feedback/Reviews to detect repeated patient concerns.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DoctorDashboard;
