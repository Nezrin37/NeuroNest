import React, { useMemo, useState } from 'react';
import { Clock, Edit2, Check, X, ChevronDown, ChevronUp, Tag, Search } from 'lucide-react';
import RatingStars from './RatingStars';
import TagSelector from './TagSelector';

const SENTIMENT_STYLE = {
  positive: { bg: 'var(--nn-success-bg)', color: 'var(--nn-success)', label: 'Positive' },
  neutral:  { bg: 'var(--nn-warning-bg)', color: 'var(--nn-warning)', label: 'Neutral' },
  negative: { bg: 'var(--nn-danger-bg)',  color: 'var(--nn-danger)', label: 'Negative' },
};

const ReviewCard = ({ review, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draftRating, setDraftRating] = useState(review.rating);
  const [draftText, setDraftText]     = useState(review.review_text || '');
  const [draftTags, setDraftTags]     = useState(review.tags || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const s = SENTIMENT_STYLE[review.sentiment] || SENTIMENT_STYLE.neutral;

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      await onEdit(review.id, { rating: draftRating, review_text: draftText, tags: draftTags });
      setEditing(false);
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div className="rhl-card">
      {/* Top row */}
      <div className="rhl-card-top">
        <div>
          <div className="rhl-doctor">Dr. {review.doctor_name}</div>
          <div className="rhl-meta">
            <Clock size={11} /> {review.date}
            &nbsp;·&nbsp; Appt #{review.appointment_id}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="rhl-sentiment" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          {review.can_edit && !editing && (
            <button className="rhl-edit-btn" onClick={() => setEditing(true)} title="Edit review">
              <Edit2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stars */}
      {editing ? (
        <div style={{ margin: '0.75rem 0' }}>
          <RatingStars value={draftRating} onChange={setDraftRating} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 2, margin: '0.5rem 0' }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize: '1rem', color: i <= review.rating ? 'var(--nn-warning)' : 'color-mix(in srgb, var(--nn-text-disabled) 35%, transparent)' }}>★</span>
          ))}
        </div>
      )}

      {/* Text */}
      {editing ? (
        <textarea
          className="rhl-edit-textarea"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          rows={3}
          placeholder="Describe your experience…"
        />
      ) : review.review_text && (
        <div>
          <p className="rhl-text">
            {!expanded && review.review_text.length > 120
              ? review.review_text.slice(0, 120) + '…'
              : review.review_text
            }
          </p>
          {review.review_text.length > 120 && (
            <button className="rhl-expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <TagSelector selected={draftTags} onChange={setDraftTags} />
        </div>
      ) : review.tags && review.tags.length > 0 && (
        <div className="rhl-tags">
          <Tag size={11} style={{ color: 'var(--nn-text-disabled)' }} />
          {review.tags.map((t, i) => <span key={i} className="rhl-tag">{t}</span>)}
        </div>
      )}

      {/* Edit actions */}
      {editing && (
        <div className="rhl-edit-actions">
          {err && <span style={{ color: 'var(--nn-danger)', fontSize: '0.78rem' }}>{err}</span>}
          <button className="rhl-save-btn" onClick={handleSave} disabled={saving}>
            <Check size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="rhl-cancel-btn" onClick={() => { setEditing(false); setErr(''); }}>
            <X size={13} /> Cancel
          </button>
        </div>
      )}

      {/* Edit hint */}
      {review.can_edit && !editing && (
        <div className="rhl-edit-hint">✏ Editable within 24 hours of submission</div>
      )}
      {review.complaint && (
        <div className="rhl-complaint-chip">
          🚨 Complaint raised · Status: <strong>{review.complaint.status}</strong>
        </div>
      )}
    </div>
  );
};

const ReviewHistoryList = ({ reviews, onEdit }) => {
  const [query, setQuery] = useState('');
  const [sentiment, setSentiment] = useState('all');
  const [sort, setSort] = useState('newest');
  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = query.trim().toLowerCase();
    const list = reviews.filter((r) => {
      const matchesSentiment = sentiment === 'all' || String(r.sentiment).toLowerCase() === sentiment;
      const matchesQuery =
        !q ||
        String(r.doctor_name || '').toLowerCase().includes(q) ||
        String(r.review_text || '').toLowerCase().includes(q) ||
        (Array.isArray(r.tags) && r.tags.some((t) => String(t).toLowerCase().includes(q)));
      return matchesSentiment && matchesQuery;
    });
    const sorted = [...list];
    if (sort === 'highest') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'lowest') sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return sorted;
  }, [reviews, query, sentiment, sort]);
  if (!reviews) return <div className="rhl-skeleton" />;

  return (
    <div>
      {reviews.length === 0 ? (
        <div className="rhl-empty">
          <span style={{ fontSize: '2rem' }}>📋</span>
          <p>No feedback submitted yet. Your reviews will appear here after appointments.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.6rem', marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--nn-text-disabled)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctor, text, or tags"
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 10, border: '1px solid var(--nn-border)', fontSize: '0.82rem', background: 'var(--nn-surface)', color: 'var(--nn-text-main)' }}
              />
            </div>
            <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} style={{ borderRadius: 10, border: '1px solid var(--nn-border)', padding: '0 0.6rem', fontSize: '0.82rem', background: 'var(--nn-surface)', color: 'var(--nn-text-main)' }}>
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ borderRadius: 10, border: '1px solid var(--nn-border)', padding: '0 0.6rem', fontSize: '0.82rem', background: 'var(--nn-surface)', color: 'var(--nn-text-main)' }}>
              <option value="newest">Newest</option>
              <option value="highest">Highest ★</option>
              <option value="lowest">Lowest ★</option>
            </select>
          </div>
          <div className="rhl-list">
            {filtered.map(r => <ReviewCard key={r.id} review={r} onEdit={onEdit} />)}
          </div>
          {filtered.length === 0 && (
            <div className="rhl-empty" style={{ padding: '1.2rem 0' }}>
              <p>No reviews match your filters.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewHistoryList;
