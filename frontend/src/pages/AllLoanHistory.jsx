import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

/* ─── Shared navbar ─────────────────────────────────────────────── */

function MeritNav({ onLogoClick }) {
  return (
    <nav className="plum-surface merit-nav">
      <div className="merit-logo" onClick={onLogoClick}>
        <div className="merit-logo-chip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
              fill="white" fillOpacity="0.95"
            />
          </svg>
        </div>
        <span className="merit-logo-text">Merit</span>
      </div>
      <span className="merit-badge">
        <span className="merit-badge-dot" />
        Scripted by Her 2.0 · Meesho Hackathon
      </span>
    </nav>
  );
}

/* ─── Status configs ─────────────────────────────────────────────── */

const STATUS_MAP = {
  pending:    { badgeCls: 'shop-badge shop-badge--pending',   label: 'Pending Review', dot: 'var(--color-gold)',     dotBg: 'var(--color-gold-bg)' },
  active:     { badgeCls: 'shop-badge shop-badge--active',    label: 'Active',         dot: 'var(--color-plum)',     dotBg: 'rgba(61,42,74,0.10)' },
  overdue:    { badgeCls: 'shop-badge shop-badge--overdue',   label: 'Overdue',        dot: 'var(--color-gold)',     dotBg: 'var(--color-gold-bg)' },
  defaulted:  { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Defaulted',      dot: '#B23B3B',               dotBg: 'rgba(178,59,59,0.09)' },
  loss_asset: { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Written Off',    dot: '#B23B3B',               dotBg: 'rgba(178,59,59,0.09)' },
  completed:  { badgeCls: 'trust-badge trust-badge--strong',  label: 'Completed',      dot: '#1F6E5C',               dotBg: '#DCEFE8' },
  rejected:   { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Rejected',       dot: '#B23B3B',               dotBg: 'rgba(178,59,59,0.09)' },
};

function LoanStatusBadge({ status }) {
  const c = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={c.badgeCls}>{c.label}</span>;
}

/* ─── Main component ─────────────────────────────────────────────── */

function AllLoanHistory() {
  const [loans,     setLoans]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getAllLoans().then((data) => {
      setLoans(data);
      setLoading(false);
    });
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="merit-page">
        <MeritNav onLogoClick={() => navigate('/')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div className="skeleton-card" style={{ width: '560px' }}>
            <div className="skeleton-card-header">
              <div className="skeleton-avatar" />
              <div className="skeleton-meta">
                <div className="skeleton-line skeleton-line--name" />
                <div className="skeleton-line skeleton-line--loc" />
              </div>
            </div>
            <div className="skeleton-tag-row">
              {[80, 100, 60, 90].map((w) => (
                <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived stats ── */
  const totalAmount     = loans.reduce((s, l) => s + l.amount, 0);
  const activeCount     = loans.filter((l) => ['active', 'overdue', 'overdue_final'].includes(l.status)).length;
  const completedCount  = loans.filter((l) => l.status === 'completed').length;
  const pendingCount    = loans.filter((l) => l.status === 'pending').length;
  const writtenOffCount = loans.filter((l) => ['defaulted', 'loss_asset', 'rejected'].includes(l.status)).length;

  return (
    <div className="merit-page">
      <MeritNav onLogoClick={() => navigate('/')} />

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        <div style={{
          position: 'absolute', top: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,51,151,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,147,26,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '920px', margin: '0 auto' }}>
          <button className="back-btn" onClick={() => navigate('/shop-owner')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All shops
          </button>

          <div className="page-label" style={{ marginBottom: '14px' }}>
            <span className="page-label-dot" />
            Shop Owner View
          </div>

          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
            letterSpacing: '-0.8px', color: 'var(--color-plum-ink)',
            margin: '0 0 8px', lineHeight: '1.1',
          }}>
            All{' '}
            <span className="text-gradient-pink-gold">Loan History</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
            {loans.length} loan{loans.length !== 1 ? 's' : ''} across all shops
          </p>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="pipeline-content" style={{ maxWidth: '920px' }}>

        {/* Summary chips */}
        {loans.length > 0 && (
          <div className="stat-chip-row" style={{ marginBottom: '20px' }}>
            <div className="stat-chip">
              <span className="stat-chip-value">{loans.length}</span>
              <span className="stat-chip-label">Total loans</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-value" style={{ color: 'var(--color-meesho-pink)' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
              <span className="stat-chip-label">Total disbursed</span>
            </div>
            {activeCount > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: 'var(--color-plum)', fontSize: '20px' }}>
                  {activeCount}
                </span>
                <span className="stat-chip-label">Active</span>
              </div>
            )}
            {completedCount > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: '#1F6E5C', fontSize: '20px' }}>
                  {completedCount}
                </span>
                <span className="stat-chip-label">Completed</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: 'var(--color-gold-dark)', fontSize: '20px' }}>
                  {pendingCount}
                </span>
                <span className="stat-chip-label">Pending review</span>
              </div>
            )}
            {writtenOffCount > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: '#B23B3B', fontSize: '20px' }}>
                  {writtenOffCount}
                </span>
                <span className="stat-chip-label">Written off</span>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {loans.length === 0 && (
          <div className="analysis-idle-card">
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              backgroundColor: '#DCEFE8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="#1F6E5C" strokeWidth="2">
                <path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="analysis-idle-title">No loans applied yet</h2>
            <p className="analysis-idle-desc">
              When shop owners apply for Merit credit, their loans will appear here.
            </p>
            <button
              className="run-analysis-btn"
              style={{ fontSize: '14px', padding: '12px 32px' }}
              onClick={() => navigate('/shop-owner')}
            >
              Browse shops →
            </button>
          </div>
        )}

        {/* ── Loan rows inside one card ── */}
        {loans.length > 0 && (
          <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>

            {/* Card header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(61,42,74,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p className="result-eyebrow">All loans · {loans.length} records</p>
              <p style={{ fontSize: '11px', color: 'var(--color-plum-soft)', margin: 0 }}>
                Click any row to view full loan history
              </p>
            </div>

            {/* Rows */}
            {loans.map((loan, idx) => {
              const cfg       = STATUS_MAP[loan.status] || STATUS_MAP.pending;
              const isHovered = hoveredId === loan.id;

              return (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/shop-owner/${loan.shop_id}/history`)}
                  onMouseEnter={() => setHoveredId(loan.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: idx < loans.length - 1
                      ? '1px solid rgba(61,42,74,0.06)'
                      : 'none',
                    cursor: 'pointer',
                    backgroundColor: isHovered
                      ? 'rgba(244,51,151,0.03)'
                      : 'transparent',
                    borderLeft: isHovered
                      ? '3px solid var(--color-meesho-pink)'
                      : '3px solid transparent',
                    transition: 'background-color 0.18s, border-color 0.18s',
                  }}
                >
                  {/* Left: status chip + shop info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Status indicator */}
                    <div style={{
                      width: '36px', height: '36px',
                      borderRadius: '10px',
                      backgroundColor: cfg.dotBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '9px', height: '9px',
                        borderRadius: '50%',
                        backgroundColor: cfg.dot,
                      }} />
                    </div>

                    {/* Shop name + details */}
                    <div>
                      <p style={{
                        fontSize: '14px', fontWeight: '700',
                        color: 'var(--color-plum-ink)',
                        margin: '0 0 2px', lineHeight: '1.2',
                      }}>
                        {loan.shop_name}
                      </p>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--color-plum-soft)',
                        margin: 0,
                      }}>
                        ₹{loan.amount.toLocaleString('en-IN')}
                        &nbsp;·&nbsp;{loan.tenure_weeks}w
                        &nbsp;·&nbsp;{new Date(loan.applied_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: status badge + arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <LoanStatusBadge status={loan.status} />
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={isHovered ? 'var(--color-meesho-pink)' : 'rgba(61,42,74,0.22)'}
                      strokeWidth="2.5"
                      style={{ transition: 'stroke 0.18s' }}
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AllLoanHistory;