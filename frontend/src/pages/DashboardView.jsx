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

/* ─── Status configs (shared across pending + all-loans) ─────────── */

const STATUS_MAP = {
  pending:    { badgeCls: 'shop-badge shop-badge--pending',   label: 'Pending',     dot: 'var(--color-gold)',  dotBg: 'var(--color-gold-bg)' },
  active:     { badgeCls: 'shop-badge shop-badge--active',    label: 'Active',      dot: 'var(--color-plum)', dotBg: 'rgba(61,42,74,0.10)' },
  overdue:    { badgeCls: 'shop-badge shop-badge--overdue',   label: 'Overdue',     dot: 'var(--color-gold)', dotBg: 'var(--color-gold-bg)' },
  defaulted:  { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Defaulted',   dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
  loss_asset: { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Written Off', dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
  completed:  { badgeCls: 'trust-badge trust-badge--strong',  label: 'Completed',   dot: '#1F6E5C',           dotBg: '#DCEFE8' },
  rejected:   { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Rejected',    dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
};

function LoanStatusBadge({ status }) {
  const c = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={c.badgeCls}>{c.label}</span>;
}

/* ─── Pending application card ───────────────────────────────────── */

function PendingCard({ loan, isFlagged, actingOn, onDecision }) {
  const [expanded, setExpanded] = useState(false);
  const isActing = actingOn === loan.id;

  const detailItems = [
    { label: 'Loan Amount', value: `₹${loan.amount.toLocaleString('en-IN')}`, color: 'var(--color-meesho-pink)', weight: '800' },
    { label: 'Tenure',      value: `${loan.tenure_weeks} weeks`,              color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Interest Tier', value: loan.interest_tier,                      color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Distributor', value: loan.distributor_name,                     color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Applied',     value: new Date(loan.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--color-plum-soft)', weight: '600' },
    ...(loan.shop_id ? [{ label: 'Shop ID', value: loan.shop_id, color: 'var(--color-plum-soft)', weight: '600' }] : []),
  ];

  return (
    <div
      className="result-card"
      style={{
        marginBottom: '12px',
        borderLeft: isFlagged ? '3px solid #B23B3B' : '3px solid transparent',
        padding: '18px 22px',
      }}
    >
      {/* ── Header row ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap',
      }}>
        {/* Shop info */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-plum-ink)', margin: 0 }}>
              {loan.shop_name}
            </p>
            {isFlagged && (
              <span style={{
                fontSize: '10px', fontWeight: '800',
                color: '#B23B3B', backgroundColor: 'rgba(178,59,59,0.09)',
                border: '1px solid rgba(178,59,59,0.20)',
                padding: '3px 9px', borderRadius: '100px',
              }}>
                ⚠ Repayment issue on file
              </span>
            )}
          </div>
          <p className="result-body" style={{ margin: 0 }}>
            <strong style={{ color: 'var(--color-meesho-pink)' }}>₹{loan.amount.toLocaleString('en-IN')}</strong>
            &nbsp;·&nbsp;{loan.tenure_weeks} weeks
            &nbsp;·&nbsp;{loan.interest_tier} interest
            &nbsp;·&nbsp;to <strong style={{ color: 'var(--color-plum-ink)' }}>{loan.distributor_name}</strong>
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* View / Hide toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '8px 14px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700',
              color: expanded ? 'var(--color-plum)' : 'var(--color-plum-soft)',
              backgroundColor: expanded ? 'rgba(61,42,74,0.10)' : 'rgba(61,42,74,0.05)',
              border: `1px solid ${expanded ? 'rgba(61,42,74,0.22)' : 'rgba(61,42,74,0.12)'}`,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.2s',
            }}
          >
            {expanded ? 'Hide' : 'View'}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Reject */}
          <button
            disabled={isActing}
            onClick={() => onDecision(loan.id, 'reject')}
            style={{
              padding: '8px 18px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700',
              color: '#B23B3B', backgroundColor: 'rgba(178,59,59,0.09)',
              border: '1px solid rgba(178,59,59,0.22)',
              cursor: isActing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isActing ? 0.55 : 1, transition: 'all 0.2s',
            }}
          >
            Reject
          </button>

          {/* Approve */}
          <button
            disabled={isActing}
            onClick={() => onDecision(loan.id, 'approve')}
            style={{
              padding: '8px 18px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700',
              color: 'white', backgroundColor: '#1F6E5C',
              border: 'none',
              cursor: isActing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 3px 10px rgba(31,110,92,0.28)',
              opacity: isActing ? 0.55 : 1, transition: 'all 0.2s',
            }}
          >
            {isActing ? 'Working…' : '✓ Approve'}
          </button>
        </div>
      </div>

      {/* ── Expandable details panel ── */}
      {expanded && (
        <div style={{
          marginTop: '16px', paddingTop: '16px',
          borderTop: '1px solid rgba(61,42,74,0.08)',
        }}>
          <p style={{
            fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '0.6px', color: 'var(--color-plum-soft)', margin: '0 0 14px',
          }}>
            Application Details
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '14px 20px',
          }}>
            {detailItems.map(({ label, value, color, weight }) => (
              <div key={label}>
                <p style={{
                  fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.4px', color: 'var(--color-plum-soft)', margin: '0 0 4px',
                }}>
                  {label}
                </p>
                <p style={{ fontSize: '14px', fontWeight: weight, color, margin: 0 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────────── */

function DashboardView() {
  const [stats,   setStats]   = useState(null);
  const [pending, setPending] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actingOn, setActingOn] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  const loadAll = async () => {
    const [statsData, pendingData, allData] = await Promise.all([
      api.getDashboardStats(),
      api.getPendingLoans(),
      api.getAllLoans(),
    ]);
    setStats(statsData);
    setPending(pendingData);
    setAllLoans(allData);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleDecision = async (loanId, decision) => {
    setActingOn(loanId);
    try {
      if (decision === 'approve') await api.approveLoan(loanId);
      else await api.rejectLoan(loanId);
      await loadAll();
    } catch (e) {
      alert(`Failed: ${e.message}`);
    } finally {
      setActingOn(null);
    }
  };

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
              {[80, 110, 70, 90, 60].map((w) => (
                <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const flaggedShopIds = new Set((stats?.flagged_shops || []).map((s) => s.shop_id));

  return (
    <div className="merit-page">
      <MeritNav onLogoClick={() => navigate('/')} />

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        <div style={{
          position: 'absolute', top: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,51,151,0.13) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,147,26,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>
          {/* Gold-tinted label pill for credit officer context */}
          <div
            className="page-label"
            style={{
              marginBottom: '14px',
              backgroundColor: 'var(--color-gold-bg)',
              border: '1px solid rgba(184,121,31,0.25)',
              color: 'var(--color-gold-dark)',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: 'var(--color-gold)', display: 'inline-block', flexShrink: 0,
            }} />
            Credit Officer View
          </div>

          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: '800',
            letterSpacing: '-0.8px', color: 'var(--color-plum-ink)',
            margin: '0 0 8px', lineHeight: '1.1',
          }}>
            MPPL{' '}
            <span className="text-gradient-pink-gold">Lending Portfolio</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
            {allLoans.length} loan{allLoans.length !== 1 ? 's' : ''} across all shops
            {pending.length > 0 && (
              <span style={{
                marginLeft: '10px',
                color: 'var(--color-gold-dark)',
                fontWeight: '700',
              }}>
                · {pending.length} awaiting your review
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="pipeline-content" style={{ maxWidth: '1140px' }}>

        {/* ── Stats row ── */}
        <div className="stat-chip-row" style={{ marginBottom: '28px' }}>
          <div className="stat-chip">
            <span className="stat-chip-value">{stats.total_analyses}</span>
            <span className="stat-chip-label">Shops analysed</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value">{stats.average_trust_score}</span>
            <span className="stat-chip-label">Avg trust score</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value" style={{ color: 'var(--color-meesho-pink)' }}>
              ₹{stats.total_disbursed.toLocaleString('en-IN')}
            </span>
            <span className="stat-chip-label">Total disbursed</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value" style={{ color: 'var(--color-plum)', fontSize: '22px' }}>
              {stats.active_loans}
            </span>
            <span className="stat-chip-label">Active loans</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value" style={{ color: 'var(--color-gold-dark)', fontSize: '22px' }}>
              {stats.pending_applications}
            </span>
            <span className="stat-chip-label">Pending review</span>
          </div>
        </div>

        {/* ── Pending Applications ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '16px',
          }}>
            <p className="result-eyebrow" style={{ margin: 0 }}>
              Pending Applications
            </p>
            {pending.length > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: '800',
                color: 'var(--color-gold-dark)',
                backgroundColor: 'var(--color-gold-bg)',
                border: '1px solid rgba(184,121,31,0.22)',
                padding: '2px 10px', borderRadius: '100px',
              }}>
                {pending.length} to review
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="result-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: '#DCEFE8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F6E5C" strokeWidth="2.2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="result-body" style={{ margin: 0 }}>
                All clear — no applications waiting for review.
              </p>
            </div>
          ) : (
            pending.map((loan) => (
              <PendingCard
                key={loan.id}
                loan={loan}
                isFlagged={flaggedShopIds.has(loan.shop_id)}
                actingOn={actingOn}
                onDecision={handleDecision}
              />
            ))
          )}
        </div>

        {/* ── All Loans ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <p className="result-eyebrow" style={{ margin: 0 }}>All Loans</p>
            <span style={{
              fontSize: '11px', fontWeight: '700',
              color: 'var(--color-plum-soft)',
              backgroundColor: 'rgba(61,42,74,0.06)',
              padding: '2px 10px', borderRadius: '100px',
            }}>
              {allLoans.length} records
            </span>
          </div>

          {allLoans.length === 0 ? (
            <div className="result-card" style={{ padding: '18px 22px' }}>
              <p className="result-body" style={{ margin: 0 }}>No loans have been applied for yet.</p>
            </div>
          ) : (
            <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Column headers */}
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(61,42,74,0.08)',
                backgroundColor: 'rgba(61,42,74,0.03)',
              }}>
                {[
                  { label: 'Shop',    flex: '2 1 160px' },
                  { label: 'Amount',  flex: '1 1 100px' },
                  { label: 'Tenure',  flex: '1 1 80px' },
                  { label: 'Tier',    flex: '1 1 80px' },
                  { label: 'Status',  flex: '1 1 100px' },
                  { label: 'Applied', flex: '1 1 100px' },
                ].map(({ label, flex }) => (
                  <span key={label} style={{
                    flex, fontSize: '10px', fontWeight: '800',
                    textTransform: 'uppercase', letterSpacing: '0.6px',
                    color: 'var(--color-plum-soft)', minWidth: 0,
                  }}>
                    {label}
                  </span>
                ))}
                {/* Arrow column spacer */}
                <span style={{ width: '22px', flexShrink: 0 }} />
              </div>

              {/* Rows */}
              {allLoans.map((loan, idx) => {
                const cfg       = STATUS_MAP[loan.status] || STATUS_MAP.pending;
                const isHovered = hoveredId === loan.id;

                return (
                  <div
                    key={loan.id}
                    onClick={() => navigate(`/dashboard/shop/${loan.shop_id}`)}
                    onMouseEnter={() => setHoveredId(loan.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 20px',
                      borderBottom: idx < allLoans.length - 1
                        ? '1px solid rgba(61,42,74,0.06)'
                        : 'none',
                      cursor: 'pointer',
                      backgroundColor: isHovered ? 'rgba(244,51,151,0.03)' : 'transparent',
                      borderLeft: isHovered ? '3px solid var(--color-meesho-pink)' : '3px solid transparent',
                      transition: 'background-color 0.16s, border-color 0.16s',
                    }}
                  >
                    {/* Shop name with status dot */}
                    <div style={{ flex: '2 1 160px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: cfg.dot, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '13px', fontWeight: '700',
                        color: 'var(--color-plum-ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {loan.shop_name}
                      </span>
                    </div>

                    <span style={{ flex: '1 1 100px', fontSize: '13px', fontWeight: '700', color: 'var(--color-plum-ink)' }}>
                      ₹{loan.amount.toLocaleString('en-IN')}
                    </span>
                    <span style={{ flex: '1 1 80px', fontSize: '13px', color: 'var(--color-plum-mid)' }}>
                      {loan.tenure_weeks}w
                    </span>
                    <span style={{ flex: '1 1 80px', fontSize: '13px', color: 'var(--color-plum-mid)', textTransform: 'capitalize' }}>
                      {loan.interest_tier}
                    </span>
                    <span style={{ flex: '1 1 100px' }}>
                      <LoanStatusBadge status={loan.status} />
                    </span>
                    <span style={{ flex: '1 1 100px', fontSize: '12px', color: 'var(--color-plum-soft)' }}>
                      {new Date(loan.applied_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>

                    {/* Arrow */}
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke={isHovered ? 'var(--color-meesho-pink)' : 'rgba(61,42,74,0.20)'}
                      strokeWidth="2.5" style={{ flexShrink: 0, transition: 'stroke 0.16s' }}
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;