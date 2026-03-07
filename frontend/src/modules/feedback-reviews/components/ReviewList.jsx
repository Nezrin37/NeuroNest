import React, { useMemo, useState } from 'react';
import { Calendar, Hash, ChevronDown, ChevronUp, Search } from 'lucide-react';

const SENTIMENT_STYLE = {
  positive: { bg: 'var(--nn-success-bg)', color: 'var(--nn-success)' },
  neutral:  { bg: 'var(--nn-warning-bg)', color: 'var(--nn-warning)' },
  negative: { bg: 'var(--nn-danger-bg)',  color: 'var(--nn-danger)' },
};

const StarRow = ({ rating }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ fontSize: '0.85rem', color: i <= rating ? 'var(--nn-warning)' : 'color-mix(in srgb, var(--nn-text-disabled) 30%, transparent)' }}>★</span>
    ))}
  </div>
);

const ReviewCard = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  const s = SENTIMENT_STYLE[review.sentiment] || SENTIMENT_STYLE.neutral;
  const hasLongText = review.review_text && review.review_text.length > 140;

  return (
    <div className="df-review-card">
      <div className="df-review-top">
        <div className="df-review-meta">
          <StarRow rating={review.rating} />
          <span className="df-review-patient">{review.patient_anonymized}</span>
        </div>
        <div className="df-review-right">
          <span className="df-sentiment-tag" style={{ background: s.bg, color: s.color }}>
            {review.sentiment}
          </span>
          <div className="df-review-date">
            <Calendar size={11} />
            <span>{review.date}</span>
          </div>
          <div className="df-review-date">
            <Hash size={11} />
            <span>Appt {review.appointment_id}</span>
          </div>
        </div>
      </div>

      {review.review_text && (
        <div className="df-review-text">
          <p>{hasLongText && !expanded ? review.review_text.slice(0, 140) + '…' : review.review_text}</p>
          {hasLongText && (
            <button className="df-expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
            </button>
          )}
        </div>
      )}

      {review.tags && review.tags.length > 0 && (
        <div className="df-review-tags">
          {review.tags.map((tag, i) => (
            <span key={i} className="df-review-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewList = ({ reviews }) => {
  const [query, setQuery] = useState('');
  const [sentiment, setSentiment] = useState('all');
  const [minRating, setMinRating] = useState('all');
  const [sort, setSort] = useState('newest');
  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = query.trim().toLowerCase();
    const list = reviews.filter((r) => {
      const bySentiment = sentiment === 'all' || String(r.sentiment).toLowerCase() === sentiment;
      const byRating = minRating === 'all' || Number(r.rating || 0) >= Number(minRating);
      const byQuery =
        !q ||
        String(r.review_text || '').toLowerCase().includes(q) ||
        String(r.patient_anonymized || '').toLowerCase().includes(q) ||
        (Array.isArray(r.tags) && r.tags.some((t) => String(t).toLowerCase().includes(q)));
      return bySentiment && byRating && byQuery;
    });
    const sorted = [...list];
    if (sort === 'highest') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'lowest') sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return sorted;
  }, [reviews, query, sentiment, minRating, sort]);
  if (!reviews) return <div className="df-panel skeleton" style={{ height: 200 }} />;

  return (
    <div className="df-panel">
      <div className="df-panel-header">
        <h3 className="df-panel-title">Patient Feedback</h3>
        <span className="df-panel-sub">{filtered.length} of {reviews.length} entries</span>
      </div>
      {reviews.length === 0 ? (
        <p className="df-empty-msg">No reviews have been recorded yet.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.55rem', marginBottom: '0.9rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--nn-text-disabled)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search review text or tags"
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 10, border: '1px solid var(--df-border)', background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.82rem' }}
              />
            </div>
            <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} style={{ borderRadius: 10, border: '1px solid var(--df-border)', background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.82rem', padding: '0 0.5rem' }}>
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} style={{ borderRadius: 10, border: '1px solid var(--df-border)', background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.82rem', padding: '0 0.5rem' }}>
              <option value="all">All ratings</option>
              <option value="4">4★ and above</option>
              <option value="3">3★ and above</option>
              <option value="2">2★ and above</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ borderRadius: 10, border: '1px solid var(--df-border)', background: 'var(--df-bg)', color: 'var(--df-text)', fontSize: '0.82rem', padding: '0 0.5rem' }}>
              <option value="newest">Newest</option>
              <option value="highest">Highest ★</option>
              <option value="lowest">Lowest ★</option>
            </select>
          </div>
          <div className="df-review-list">
            {filtered.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
          {filtered.length === 0 && <p className="df-empty-msg">No reviews match current filters.</p>}
        </>
      )}
    </div>
  );
};

export default ReviewList;
