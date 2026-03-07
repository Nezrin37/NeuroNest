import React, { useMemo } from 'react';
import { RefreshCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDoctorFeedback } from '../../hooks/useDoctorFeedback';
import { getUser } from '../../utils/auth';
import FeedbackOverviewCards from './components/FeedbackOverviewCards';
import RatingDistributionChart from './components/RatingDistributionChart';
import PerformanceTrendChart from './components/PerformanceTrendChart';
import TagAnalyticsPanel from './components/TagAnalyticsPanel';
import ReviewList from './components/ReviewList';

// ─── Quality Alert Logic ──────────────────────────────────────────────────────
const QualityAlert = ({ summary, reviews }) => {
  const show = useMemo(() => {
    if (!summary || !reviews) return null;
    // Alert: 3 or more 1★ in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOneStar = reviews.filter(r => r.rating === 1 && new Date(r.date) >= sevenDaysAgo).length;
    if (recentOneStar >= 3) return `⚠ ${recentOneStar} one-star reviews in the past 7 days. Review your recent consultations.`;
    if (summary.negative_reviews_30d >= 5) return `⚠ ${summary.negative_reviews_30d} negative reviews in the last 30 days. Consider reviewing patterns.`;
    return null;
  }, [summary, reviews]);

  if (!show) return null;

  return (
    <div className="df-alert-banner">
      <AlertTriangle size={18} />
      <div>
        <div className="df-alert-title">Quality Alert</div>
        <div className="df-alert-msg">{show}</div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const DoctorFeedbackPage = () => {
  // Get doctor ID from stored user object
  const doctorId = useMemo(() => {
    try {
      const user = getUser();
      return user?.id || null;
    } catch { return null; }
  }, []);

  const { summary, distribution, trend, tags, reviews, loading, error, refresh } = useDoctorFeedback(doctorId);

  if (error) return (
    <div className="df-page df-center">
      <AlertTriangle size={44} color="#ef4444" />
      <h2 style={{ marginTop: '1rem', color: 'var(--df-text)' }}>Unable to load feedback</h2>
      <p style={{ color: 'var(--df-muted)', marginBottom: '1.5rem' }}>{error}</p>
      <button className="df-btn" onClick={refresh}>Retry</button>
    </div>
  );

  return (
    <div className="df-page">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="df-header">
        <div>
          <h1 className="df-heading">Performance Feedback</h1>
          <p className="df-subheading">Internal Clinical Quality Monitor · For your eyes only</p>
        </div>
        <button className="df-icon-btn" onClick={refresh} disabled={loading} title="Refresh">
          <RefreshCcw size={17} className={loading ? 'df-spin' : ''} />
        </button>
      </div>

      {/* ── Quality Alert ──────────────────────────────────────────── */}
      <QualityAlert summary={summary} reviews={reviews} />

      {/* ── Overview Cards ─────────────────────────────────────────── */}
      <FeedbackOverviewCards summary={summary} />

      {/* ── Charts row ─────────────────────────────────────────────── */}
      <div className="df-charts-row">
        <RatingDistributionChart distribution={distribution} />
        <PerformanceTrendChart trend={trend} />
      </div>

      {/* ── Tag Analytics ──────────────────────────────────────────── */}
      <TagAnalyticsPanel tags={tags} />

      {/* ── AI-style Insight Summary ───────────────────────────────── */}
      {summary && summary.total_reviews > 0 && (
        <div className="df-ai-block">
          <div className="df-ai-header">
            <ShieldCheck size={16} />
            <span>Clinical Insight Summary</span>
          </div>
          <p className="df-ai-text">
            {summary.avg_rating >= 4
              ? `Patients consistently rate your care highly (avg ${summary.avg_rating}★). Keep maintaining your communication standards.`
              : summary.avg_rating >= 3
              ? `Your average rating is ${summary.avg_rating}★. There is room for growth — check the tag analytics to identify recurring concerns.`
              : `Your average rating is ${summary.avg_rating}★. Immediate attention is recommended. Review feedback patterns and discuss with your department head.`}
            {summary.negative_reviews_30d > 0 && ` You have ${summary.negative_reviews_30d} negative review(s) in the last 30 days to address.`}
          </p>
        </div>
      )}

      {/* ── Review List ─────────────────────────────────────────────── */}
      <ReviewList reviews={reviews} />

      {/* ── Loading overlay ──────────────────────────────────────── */}
      {loading && !summary && (
        <div className="df-loading-overlay">
          <div className="df-spinner" />
          <p>Loading feedback data…</p>
        </div>
      )}

      <style>{`
        :root {
          --df-bg: var(--nn-bg);
          --df-panel: var(--nn-surface);
          --df-text: var(--nn-text-main);
          --df-muted: var(--nn-text-muted);
          --df-border: var(--nn-border);
          --df-accent: var(--nn-primary);
          --df-accent-soft: color-mix(in srgb, var(--nn-primary) 10%, transparent);
          --df-shadow: var(--nn-shadow);
          --df-radius: 16px;
        }
        body.dark {
          --df-bg: var(--nn-bg);
          --df-panel: var(--nn-surface);
          --df-text: var(--nn-text-main);
          --df-muted: var(--nn-text-muted);
          --df-border: var(--nn-border);
          --df-shadow: var(--nn-shadow);
        }

        .df-page {
          padding: 2rem 2.5rem;
          background: var(--df-bg);
          min-height: calc(100vh - 70px);
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--df-text);
          animation: dfFadeIn 0.4s ease-out;
        }
        @keyframes dfFadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }

        .df-center { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding-top: 8rem; }

        /* Header */
        .df-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 1.75rem;
        }
        .df-heading {
          font-size: 1.7rem; font-weight: 900; letter-spacing: -0.02em;
          margin: 0; background: linear-gradient(135deg, var(--df-text) 0%, var(--df-accent) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .df-subheading { margin: 0.3rem 0 0; font-size: 0.72rem; font-weight: 600; color: var(--df-muted); letter-spacing: 0.08em; text-transform: uppercase; }

        .df-icon-btn {
          background: var(--df-panel); border: 1px solid var(--df-border); color: var(--df-muted);
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; transition: all 0.2s;
        }
        .df-icon-btn:hover { color: var(--df-accent); border-color: var(--df-accent); }

        /* Alert */
        .df-alert-banner {
          display: flex; align-items: flex-start; gap: 1rem;
          background: color-mix(in srgb, var(--nn-danger) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--nn-danger) 25%, transparent);
          border-left: 4px solid var(--nn-danger); border-radius: var(--df-radius);
          padding: 1rem 1.25rem; margin-bottom: 1.5rem; color: var(--nn-danger);
          animation: dfFadeIn 0.3s ease;
        }
        .df-alert-title { font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .df-alert-msg { font-size: 0.85rem; margin-top: 0.2rem; opacity: 0.9; }

        /* Cards */
        .df-cards-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem; margin-bottom: 1.5rem;
        }
        .df-card {
          background: var(--df-panel); border: 1px solid var(--df-border);
          border-radius: var(--df-radius); padding: 1.4rem; display: flex;
          gap: 1rem; align-items: flex-start; box-shadow: var(--df-shadow);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .df-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .df-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .df-card-label { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--df-muted); margin-bottom: 0.35rem; }
        .df-card-value { font-size: 1.65rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; }
        .df-card-sub { font-size: 0.65rem; color: var(--df-muted); margin-top: 0.4rem; font-weight: 600; }
        .df-card.skeleton { background: linear-gradient(90deg, var(--df-border) 25%, var(--df-panel) 50%, var(--df-border) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; height: 100px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* Charts row */
        .df-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        @media (max-width: 768px) { .df-charts-row { grid-template-columns: 1fr; } }

        /* Panel */
        .df-panel {
          background: var(--df-panel); border: 1px solid var(--df-border);
          border-radius: var(--df-radius); padding: 1.4rem; box-shadow: var(--df-shadow);
          margin-bottom: 1.25rem;
        }
        .df-panel.skeleton { animation: shimmer 1.5s infinite; background: linear-gradient(90deg, var(--df-border) 25%, var(--df-panel) 50%, var(--df-border) 75%); background-size: 200% 100%; }
        .df-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .df-panel-title { font-size: 0.95rem; font-weight: 900; color: var(--df-text); margin: 0; letter-spacing: -0.01em; }
        .df-panel-sub { font-size: 0.65rem; color: var(--df-muted); font-weight: 700; }
        .df-empty-msg { color: var(--df-muted); font-size: 0.85rem; text-align: center; padding: 2rem 0; }

        /* Distribution */
        .df-dist-bars { display: flex; flex-direction: column; gap: 0.7rem; }
        .df-dist-row { display: flex; align-items: center; gap: 0.75rem; }
        .df-dist-label { width: 24px; text-align: right; font-size: 0.78rem; flex-shrink: 0; }
        .df-dist-track { flex: 1; height: 8px; background: var(--df-border); border-radius: 99px; overflow: hidden; }
        .df-dist-fill { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
        .df-dist-count { width: 60px; text-align: right; font-size: 0.72rem; color: var(--df-muted); display: flex; gap: 0.4rem; justify-content: flex-end; }
        .df-dist-pct { opacity: 0.5; }

        /* Trend */
        .df-trend-container { padding: 0.25rem 0 0.5rem; }
        .df-trend-count-row { display: flex; justify-content: space-around; margin-top: 0.25rem; }
        .df-trend-count-item { display: flex; align-items: center; gap: 4px; font-size: 0.6rem; color: var(--df-muted); }
        .df-trend-count-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--df-accent); }

        /* Tags */
        .df-tags-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; }
        .df-tag-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem 0.4rem 0.65rem; border-radius: 8px; border: 1px solid; font-size: 0.75rem; font-weight: 700; transition: transform 0.2s; }
        .df-tag-item:hover { transform: translateY(-1px); }
        .df-tag-name { }
        .df-tag-count { padding: 0.15rem 0.45rem; border-radius: 6px; font-size: 0.65rem; font-weight: 900; }

        /* AI block */
        .df-ai-block {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--nn-primary) 12%, transparent) 0%,
            color-mix(in srgb, var(--nn-info) 8%, transparent) 100%
          );
          border: 1px solid color-mix(in srgb, var(--nn-primary) 25%, transparent);
          border-radius: var(--df-radius);
          padding: 1.25rem 1.4rem; margin-bottom: 1.25rem;
        }
        .df-ai-header { display: flex; align-items: center; gap: 0.5rem; color: var(--df-accent); font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
        .df-ai-text { font-size: 0.9rem; line-height: 1.7; color: var(--df-text); margin: 0; opacity: 0.85; }

        /* Review list */
        .df-review-list { display: flex; flex-direction: column; gap: 1rem; }
        .df-review-card { background: var(--df-bg); border: 1px solid var(--df-border); border-radius: 12px; padding: 1.1rem 1.25rem; transition: border-color 0.2s; }
        .df-review-card:hover { border-color: var(--df-accent); }
        .df-review-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.6rem; flex-wrap: wrap; }
        .df-review-meta { display: flex; flex-direction: column; gap: 0.35rem; }
        .df-review-patient { font-size: 0.7rem; color: var(--df-muted); font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .df-review-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .df-sentiment-tag { padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; }
        .df-review-date { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--df-muted); font-weight: 600; }
        .df-review-text p { font-size: 0.87rem; line-height: 1.65; color: var(--df-text); margin: 0 0 0.4rem; opacity: 0.85; }
        .df-expand-btn { background: none; border: none; color: var(--df-accent); font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0; }
        .df-review-tags { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.6rem; }
        .df-review-tag { background: var(--df-accent-soft); color: var(--df-accent); font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--nn-primary) 28%, transparent); }

        /* Misc */
        .df-btn { background: var(--df-accent); color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
        .df-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .df-loading-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 8rem; color: var(--df-muted); }
        .df-spinner { width: 36px; height: 36px; border: 3px solid var(--df-border); border-top-color: var(--df-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
};

export default DoctorFeedbackPage;
