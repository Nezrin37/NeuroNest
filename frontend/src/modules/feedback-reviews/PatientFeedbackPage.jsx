import React from 'react';
import { ClipboardList, RefreshCcw, AlertTriangle } from 'lucide-react';
import { usePatientFeedback } from '../../hooks/usePatientFeedback';
import FeedbackForm from './components/FeedbackForm';
import ReviewHistoryList from './components/ReviewHistoryList';
import ComplaintStatusCard from './components/ComplaintStatusCard';

const PatientFeedbackPage = () => {
  const {
    appointments, reviews, complaints,
    loading, error,
    submitReview, editReview, refresh,
  } = usePatientFeedback();

  return (
    <div className="pfp-page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="pfp-header">
        <div>
          <h1 className="pfp-heading">Feedback & Reviews</h1>
          <p className="pfp-sub">Your voice shapes the quality of care — all feedback is confidential</p>
        </div>
        <button className="pfp-refresh-btn" onClick={refresh} disabled={loading} title="Refresh">
          <RefreshCcw size={16} className={loading ? 'pfp-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="pfp-error-banner">
          <AlertTriangle size={16} /> Unable to load data: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <div style={{ background: 'var(--nn-surface)', border: '1px solid var(--nn-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--nn-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pending Reviews</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--nn-primary)' }}>{appointments.length}</div>
        </div>
        <div style={{ background: 'var(--nn-surface)', border: '1px solid var(--nn-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--nn-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Submitted</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--nn-info)' }}>{reviews.length}</div>
        </div>
        <div style={{ background: 'var(--nn-surface)', border: '1px solid var(--nn-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--nn-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Open Complaints</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--nn-danger)' }}>{(complaints || []).filter((c) => c.status !== 'resolved').length}</div>
        </div>
      </div>

      {/* ── Leave Feedback ─────────────────────────────── */}
      <FeedbackForm appointments={appointments} onSubmit={submitReview} />

      {/* ── Complaint Tracking ─────────────────────────── */}
      <ComplaintStatusCard complaints={complaints} />

      {/* ── Review History ─────────────────────────────── */}
      <div className="pfp-section">
        <div className="pfp-section-header">
          <ClipboardList size={18} />
          <h2 className="pfp-section-title">My Submitted Reviews</h2>
          <span className="pfp-section-count">{reviews.length}</span>
        </div>
        <ReviewHistoryList reviews={reviews} onEdit={editReview} />
      </div>

      <style>{`
        /* ── Page Layout ──────────────────────────────────── */
        .pfp-page {
          padding: 2rem 2.5rem;
          min-height: calc(100vh - 70px);
          background: var(--nn-bg);
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--nn-text-main);
          animation: pfpIn 0.4s ease-out;
        }
        body.dark .pfp-page { background: var(--nn-bg); color: var(--nn-text-main); }
        @keyframes pfpIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .pfp-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.75rem; }
        .pfp-heading {
          font-size: 1.85rem; font-weight: 900; margin: 0; letter-spacing: -0.025em;
          background: linear-gradient(135deg, var(--nn-text-main) 0%, var(--nn-primary) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        body.dark .pfp-heading { background: linear-gradient(135deg, var(--nn-text-main) 0%, var(--nn-primary) 100%); -webkit-background-clip: text; background-clip: text; }
        .pfp-sub { margin: 0.3rem 0 0; font-size: 0.82rem; color: var(--nn-text-muted); }
        .pfp-refresh-btn {
          background: var(--nn-surface); border: 1.5px solid var(--nn-border); color: var(--nn-text-muted);
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        body.dark .pfp-refresh-btn { background: var(--nn-surface); border-color: var(--nn-border); }
        .pfp-refresh-btn:hover { border-color: var(--nn-primary); color: var(--nn-primary); }
        .pfp-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pfp-error-banner { display:flex; gap:0.75rem; align-items:center; background:color-mix(in srgb, var(--nn-danger) 10%, transparent); border:1px solid color-mix(in srgb, var(--nn-danger) 20%, transparent); border-radius:12px; padding:0.85rem 1.2rem; color:var(--nn-danger); font-size:0.85rem; font-weight:700; margin-bottom:1.5rem; }

        /* ── Feedback Form Card ────────────────────────────── */
        .ff-card {
          background: var(--nn-surface); border: 1.5px solid var(--nn-border);
          border-radius: 20px; padding: 1.75rem; margin-bottom: 1.5rem;
          box-shadow: var(--nn-shadow);
        }
        body.dark .ff-card { background: var(--nn-surface); border-color: var(--nn-border); box-shadow: var(--nn-shadow); }
        .ff-card-header { display:flex; gap:1rem; align-items:flex-start; margin-bottom:1.5rem; }
        .ff-card-icon { font-size:2rem; line-height:1; }
        .ff-card-title { font-size:1.2rem; font-weight:900; color:var(--nn-text-main); margin:0; }
        body.dark .ff-card-title { color:var(--nn-text-main); }
        .ff-card-sub { font-size:0.78rem; color:var(--nn-text-disabled); margin:0.2rem 0 0; }

        .ff-success { display:flex; gap:0.85rem; align-items:flex-start; background:var(--nn-success-bg); border:1.5px solid color-mix(in srgb, var(--nn-success) 25%, transparent); border-radius:14px; padding:1rem 1.2rem; color:var(--nn-success-text); margin-bottom:1.25rem; font-size:0.9rem; }
        body.dark .ff-success { color:var(--nn-success-text); }

        /* How-to guide (when no eligible appointments) */
        .ff-how-to { padding: 0.5rem 0; }
        .ff-how-title { font-size: 0.82rem; font-weight: 900; color: var(--nn-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1.25rem; }
        body.dark .ff-how-title { color: var(--nn-text-disabled); }
        .ff-how-steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 1.25rem; }
        .ff-step { display: flex; align-items: flex-start; gap: 1rem; padding: 0.85rem 1rem; background: var(--nn-bg); border-radius: 12px; border: 1px solid var(--nn-border); }
        body.dark .ff-step { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); }
        .ff-step-num { width: 26px; height: 26px; background: linear-gradient(135deg, var(--nn-primary), var(--nn-primary-hover)); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 900; flex-shrink: 0; }
        .ff-step-label { font-size: 0.88rem; font-weight: 800; color: var(--nn-text-main); margin-bottom: 0.2rem; }
        body.dark .ff-step-label { color: var(--nn-text-main); }
        .ff-step-hint { font-size: 0.72rem; color: var(--nn-text-disabled); line-height: 1.5; }
        .ff-step-tag { display: inline-block; background: linear-gradient(135deg, var(--nn-warning), #f97316); color: white; padding: 0.1rem 0.45rem; border-radius: 6px; font-size: 0.7rem; font-weight: 900; }
        .ff-step-arrow { text-align: center; color: color-mix(in srgb, var(--nn-primary) 30%, transparent); font-size: 1rem; padding: 0.25rem 0 0.25rem 0.75rem; }
        .ff-no-pending { display: flex; align-items: center; gap: 0.5rem; background: color-mix(in srgb, var(--nn-success) 8%, transparent); border: 1px solid color-mix(in srgb, var(--nn-success) 15%, transparent); border-radius: 10px; padding: 0.7rem 1rem; margin-bottom: 1rem; }
        .ff-goto-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.8rem 1.5rem; background: linear-gradient(135deg, var(--nn-primary), var(--nn-primary-hover));
          color: white; border: none; border-radius: 11px; font-weight: 800;
          font-size: 0.88rem; cursor: pointer; transition: all 0.2s;
          box-shadow: var(--nn-shadow);
        }
        .ff-goto-btn:hover { transform: translateY(-2px); box-shadow: var(--nn-card-shadow); }

        .ff-no-appts { display:flex; flex-direction:column; align-items:center; gap:0.75rem; padding:2.5rem 0; color:var(--nn-text-disabled); text-align:center; font-size:0.9rem; }

        .ff-form { display:flex; flex-direction:column; gap:1.25rem; }
        .ff-field { display:flex; flex-direction:column; gap:0.5rem; }
        .ff-label { font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:var(--nn-text-secondary); }
        body.dark .ff-label { color:var(--nn-text-disabled); }
        .ff-required { color:var(--nn-danger); }
        .ff-optional { color:var(--nn-text-disabled); font-weight:600; text-transform:none; }

        .ff-select {
          width:100%; padding:0.8rem 1rem; border:1.5px solid var(--nn-border); border-radius:12px;
          font-size:0.9rem; font-family:inherit; background:var(--nn-bg); color:var(--nn-text-main);
          transition:border-color 0.2s, box-shadow 0.2s; cursor:pointer;
        }
        body.dark .ff-select { background:var(--nn-surface-secondary); border-color:var(--nn-border); color:var(--nn-text-main); }
        .ff-select:focus { outline:none; border-color:var(--nn-primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--nn-primary) 14%, transparent); }

        .ff-textarea {
          width:100%; padding:0.85rem 1rem; border:1.5px solid var(--nn-border); border-radius:12px;
          font-size:0.9rem; font-family:inherit; resize:vertical; background:var(--nn-bg);
          color:var(--nn-text-main); transition:border-color 0.2s; box-sizing:border-box; line-height:1.6;
        }
        body.dark .ff-textarea { background:var(--nn-surface-secondary); border-color:var(--nn-border); color:var(--nn-text-main); }
        .ff-textarea:focus { outline:none; border-color:var(--nn-primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--nn-primary) 14%, transparent); }

        /* Toggle switch */
        .ff-toggle-row { display:flex; align-items:center; gap:0.85rem; cursor:pointer; padding:0.75rem; border-radius:12px; background:var(--nn-bg); border:1px solid var(--nn-border); transition:all 0.2s; user-select:none; }
        body.dark .ff-toggle-row { background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.06); }
        .ff-toggle-row:hover { border-color:var(--nn-primary); }
        .ff-toggle { width:40px; height:22px; border-radius:99px; background:var(--nn-border); position:relative; flex-shrink:0; transition:background 0.2s; }
        .ff-toggle.on { background:var(--nn-primary); }
        .ff-toggle-thumb { width:18px; height:18px; border-radius:50%; background:white; position:absolute; top:2px; left:2px; transition:left 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.15); }
        .ff-toggle.on .ff-toggle-thumb { left:20px; }
        .ff-toggle-label { display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; font-weight:700; color:var(--nn-text-main); }
        body.dark .ff-toggle-label { color:var(--nn-text-secondary); }
        .ff-toggle-hint { font-size:0.7rem; color:var(--nn-text-disabled); margin-top:0.15rem; }

        /* Serious complaint */
        .ff-serious-toggle { display:flex; align-items:center; gap:0.85rem; cursor:pointer; padding:0.85rem 1rem; border-radius:12px; border:1.5px dashed var(--nn-border); transition:all 0.2s; user-select:none; }
        .ff-serious-toggle.active { border-color:color-mix(in srgb, var(--nn-danger) 40%, transparent); background:color-mix(in srgb, var(--nn-danger) 8%, transparent); }
        .ff-serious-toggle:hover { border-color:color-mix(in srgb, var(--nn-danger) 35%, transparent); }
        .ff-serious-label { font-size:0.88rem; font-weight:800; transition:color 0.2s; }
        .ff-serious-hint { font-size:0.7rem; color:var(--nn-text-disabled); margin-top:0.15rem; }
        .ff-serious-dot { width:16px; height:16px; border-radius:50%; border:2px solid var(--nn-border); margin-left:auto; flex-shrink:0; transition:all 0.2s; }
        .ff-serious-dot.on { background:var(--nn-danger); border-color:var(--nn-danger); box-shadow:0 0 8px color-mix(in srgb, var(--nn-danger) 45%, transparent); }
        .ff-complaint-box { background:color-mix(in srgb, var(--nn-danger) 6%, transparent); border-radius:12px; padding:1rem; border:1px solid color-mix(in srgb, var(--nn-danger) 20%, transparent); }

        .ff-error { display:flex; align-items:center; gap:0.5rem; color:var(--nn-danger); font-size:0.82rem; font-weight:700; }

        .ff-submit {
          display:inline-flex; align-items:center; gap:0.6rem;
          padding:0.9rem 2rem; background:linear-gradient(135deg,var(--nn-primary),var(--nn-primary-hover));
          color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem;
          cursor:pointer; transition:all 0.2s; align-self:flex-start;
          box-shadow:var(--nn-shadow);
        }
        .ff-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:var(--nn-card-shadow); }
        .ff-submit:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        /* ── Complaint Status Card ─────────────────────────── */
        .csc-section { margin-bottom:1.5rem; }
        .csc-header { display:flex; align-items:center; gap:0.6rem; font-size:1rem; font-weight:900; color:var(--nn-danger); margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.04em; }
        .csc-list { display:flex; flex-direction:column; gap:1rem; }
        .csc-card { background:var(--nn-surface); border:1.5px solid var(--nn-border); border-left:4px solid; border-radius:16px; padding:1.25rem; box-shadow:var(--nn-shadow); }
        body.dark .csc-card { background:var(--nn-surface); border-color:var(--nn-border); }
        .csc-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.85rem; gap:1rem; }
        .csc-complaint-id { font-size:0.7rem; font-weight:900; color:var(--nn-text-disabled); font-family:monospace; margin-bottom:0.15rem; }
        .csc-doctor { font-weight:800; font-size:0.95rem; color:var(--nn-text-main); }
        body.dark .csc-doctor { color:var(--nn-text-main); }
        .csc-status-badge { display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.85rem; border-radius:99px; font-size:0.72rem; font-weight:800; white-space:nowrap; }
        .csc-details { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.1rem; }
        .csc-detail-row { display:flex; align-items:center; gap:0.4rem; font-size:0.75rem; color:var(--nn-text-muted); }
        .csc-reason { font-size:0.82rem; color:var(--nn-text-muted); font-style:italic; background:var(--nn-bg); padding:0.65rem 0.85rem; border-radius:8px; border-left:3px solid var(--nn-border); }
        body.dark .csc-reason { background:rgba(255,255,255,0.03); }
        .csc-timeline { display:flex; align-items:center; gap:0; margin-bottom:1rem; }
        .csc-step { display:flex; align-items:center; gap:0.4rem; }
        .csc-step-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; transition:all 0.3s; }
        .csc-step-label { font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; }
        .csc-step-line { flex:1; height:2px; min-width:24px; max-width:60px; margin:0 0.35rem; transition:background 0.3s; }
        .csc-note { display:flex; gap:0.5rem; align-items:flex-start; font-size:0.72rem; color:var(--nn-text-disabled); background:var(--nn-bg); padding:0.6rem 0.85rem; border-radius:8px; }
        body.dark .csc-note { background:rgba(255,255,255,0.03); }

        /* ── Review History ────────────────────────────────── */
        .pfp-section { }
        .pfp-section-header { display:flex; align-items:center; gap:0.7rem; margin-bottom:1.1rem; }
        .pfp-section-title { font-size:1.05rem; font-weight:900; color:var(--nn-text-main); margin:0; }
        body.dark .pfp-section-title { color:var(--nn-text-main); }
        .pfp-section-count { background:var(--nn-primary); color:white; font-size:0.65rem; font-weight:900; padding:0.2rem 0.5rem; border-radius:99px; }

        .rhl-list { display:flex; flex-direction:column; gap:1rem; }
        .rhl-empty { display:flex; flex-direction:column; align-items:center; gap:0.75rem; padding:3rem 0; color:var(--nn-text-disabled); text-align:center; font-size:0.88rem; }
        .rhl-skeleton { height:120px; border-radius:16px; background:linear-gradient(90deg,var(--nn-surface-secondary) 25%,var(--nn-border) 50%,var(--nn-surface-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
        @keyframes shimmer { to { background-position:-200% 0; } }

        .rhl-card { background:var(--nn-surface); border:1.5px solid var(--nn-border); border-radius:16px; padding:1.25rem; transition:border-color 0.2s, box-shadow 0.2s; }
        body.dark .rhl-card { background:var(--nn-surface); border-color:var(--nn-border); }
        .rhl-card:hover { border-color:color-mix(in srgb, var(--nn-primary) 40%, transparent); box-shadow:var(--nn-card-shadow); }
        .rhl-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-bottom:0.6rem; flex-wrap:wrap; }
        .rhl-doctor { font-weight:800; font-size:0.95rem; color:var(--nn-text-main); }
        body.dark .rhl-doctor { color:var(--nn-text-main); }
        .rhl-meta { display:flex; align-items:center; gap:0.35rem; font-size:0.68rem; color:var(--nn-text-disabled); margin-top:0.2rem; }
        .rhl-sentiment { padding:0.25rem 0.65rem; border-radius:99px; font-size:0.62rem; font-weight:900; text-transform:uppercase; }
        .rhl-edit-btn { background:color-mix(in srgb, var(--nn-primary) 10%, transparent); border:1px solid color-mix(in srgb, var(--nn-primary) 25%, transparent); color:var(--nn-primary); padding:0.4rem; border-radius:8px; cursor:pointer; display:flex; align-items:center; transition:all 0.2s; }
        .rhl-edit-btn:hover { background:color-mix(in srgb, var(--nn-primary) 18%, transparent); }
        .rhl-text { font-size:0.88rem; line-height:1.65; color:var(--nn-text-secondary); margin:0 0 0.3rem; }
        body.dark .rhl-text { color:var(--nn-text-disabled); }
        .rhl-expand-btn { background:none; border:none; color:var(--nn-primary); font-size:0.72rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; padding:0; margin-top:0.25rem; }
        .rhl-tags { display:flex; align-items:center; flex-wrap:wrap; gap:0.4rem; margin-top:0.6rem; }
        .rhl-tag { background:var(--nn-surface-secondary); color:var(--nn-text-secondary); font-size:0.65rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:6px; border:1px solid var(--nn-border); }
        body.dark .rhl-tag { background:rgba(255,255,255,0.05); color:var(--nn-text-disabled); border-color:rgba(255,255,255,0.07); }
        .rhl-edit-textarea { width:100%; padding:0.75rem 0.9rem; border:1.5px solid color-mix(in srgb, var(--nn-primary) 30%, transparent); border-radius:10px; font-size:0.88rem; font-family:inherit; resize:vertical; background:var(--nn-bg); color:var(--nn-text-main); box-sizing:border-box; margin:0.5rem 0; }
        body.dark .rhl-edit-textarea { background:var(--nn-surface-secondary); border-color:color-mix(in srgb, var(--nn-primary) 35%, transparent); color:var(--nn-text-main); }
        .rhl-edit-actions { display:flex; align-items:center; gap:0.6rem; margin-top:0.85rem; flex-wrap:wrap; }
        .rhl-save-btn { display:flex; align-items:center; gap:0.4rem; background:var(--nn-primary); color:white; border:none; padding:0.55rem 1.1rem; border-radius:8px; font-weight:800; font-size:0.8rem; cursor:pointer; }
        .rhl-cancel-btn { display:flex; align-items:center; gap:0.4rem; background:var(--nn-surface-secondary); color:var(--nn-text-muted); border:1px solid var(--nn-border); padding:0.55rem 1.1rem; border-radius:8px; font-weight:800; font-size:0.8rem; cursor:pointer; }
        body.dark .rhl-cancel-btn { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.08); color:var(--nn-text-disabled); }
        .rhl-edit-hint { font-size:0.65rem; color:var(--nn-text-disabled); margin-top:0.5rem; font-style:italic; }
        .rhl-complaint-chip { display:inline-block; margin-top:0.6rem; background:color-mix(in srgb, var(--nn-danger) 10%, transparent); border:1px solid color-mix(in srgb, var(--nn-danger) 22%, transparent); color:var(--nn-danger); font-size:0.7rem; font-weight:700; padding:0.3rem 0.7rem; border-radius:8px; }
      `}</style>
    </div>
  );
};

export default PatientFeedbackPage;
