import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopNav from '../components/layout/TopNav';

/* ─── Status badge ───────────────────────────────────────────────── */

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

/* ─── Trust badge (Strong / Moderate / Risky) ────────────────────── */

function TrustBadge({ status }) {
  const cls = {
    Strong:   'trust-badge trust-badge--strong',
    Moderate: 'trust-badge trust-badge--moderate',
    Risky:    'trust-badge trust-badge--risky',
  };
  return <span className={cls[status] || cls.Moderate}>{status}</span>;
}

/* ─── Trust progress bar ─────────────────────────────────────────── */

function TrustBar({ score }) {
  const gradient =
    score >= 70
      ? 'linear-gradient(90deg, var(--color-meesho-pink), var(--color-gold))'
      : score >= 40
      ? 'linear-gradient(90deg, var(--color-gold), var(--color-marigold))'
      : 'linear-gradient(90deg, #B23B3B, var(--color-marigold))';
  return (
    <div className="trust-bar-track">
      <div className="trust-bar-fill" style={{ width: `${score}%`, background: gradient }} />
    </div>
  );
}

/* ─── Inline approve / reject buttons ───────────────────────────── */

function ActionButtons({ loan, actingOn, onDecision }) {
  const isActing = actingOn === loan.id;
  return (
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      <button
        disabled={isActing}
        onClick={() => onDecision(loan.id, 'reject')}
        style={{
          padding: '7px 14px', borderRadius: '8px',
          fontSize: '12px', fontWeight: '700',
          color: '#B23B3B', backgroundColor: 'rgba(178,59,59,0.09)',
          border: '1px solid rgba(178,59,59,0.22)',
          cursor: isActing ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          opacity: isActing ? 0.55 : 1, transition: 'all 0.2s',
        }}
      >
        Reject
      </button>
      <button
        disabled={isActing}
        onClick={() => onDecision(loan.id, 'approve')}
        style={{
          padding: '7px 14px', borderRadius: '8px',
          fontSize: '12px', fontWeight: '700',
          color: 'white', backgroundColor: '#1F6E5C',
          border: 'none',
          cursor: isActing ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 2px 8px rgba(31,110,92,0.28)',
          opacity: isActing ? 0.55 : 1, transition: 'all 0.2s',
        }}
      >
        {isActing ? 'Working…' : '✓ Approve'}
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

function ShopDetailAdmin() {
  const { shopId }  = useParams();
  const navigate    = useNavigate();

  const [shop,         setShop]         = useState(null);
  const [analyses,     setAnalyses]     = useState([]);
  const [loans,        setLoans]        = useState([]);
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actingOn,     setActingOn]     = useState(null);
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [expandedHistoryLoanId, setExpandedHistoryLoanId] = useState(null);

  const loadAll = async () => {
    const [shops, analysesData, allLoansData, historyData] = await Promise.all([
      api.getShops(),
      api.getShopAnalyses(shopId),
      api.getAllLoans(),
      api.getTrustHistory(shopId),
    ]);
    setShop(shops.find((s) => s.shop_id === shopId));
    setAnalyses(analysesData);
    setLoans(allLoansData.filter((l) => l.shop_id === shopId));
    setTrustHistory(historyData);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [shopId]);

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
  if (loading || !shop) {
    return (
      <div className="merit-page">
        <TopNav />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div className="skeleton-card" style={{ width: '520px' }}>
            <div className="skeleton-card-header">
              <div className="skeleton-avatar" />
              <div className="skeleton-meta">
                <div className="skeleton-line skeleton-line--name" />
                <div className="skeleton-line skeleton-line--loc" />
              </div>
            </div>
            <div className="skeleton-tag-row">
              {[80, 100, 60].map((w) => (
                <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const latestAnalysis = analyses[0];
  const pendingLoans   = loans.filter((l) => l.status === 'pending');
  const currentScore   = trustHistory.length > 0
    ? trustHistory[trustHistory.length - 1].score
    : latestAnalysis?.trust_score;

  /* Trust history newest-first with score delta */
  const reversedHistory = trustHistory.slice().reverse();

  return (
    <div className="merit-page">
      <TopNav />

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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto' }}>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to dashboard
          </button>

          {/* Gold label pill */}
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
              backgroundColor: 'var(--color-gold)',
              display: 'inline-block', flexShrink: 0,
            }} />
            Credit Officer View
          </div>

          {/* Shop name + read-only badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{
              fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
              letterSpacing: '-0.8px', color: 'var(--color-plum-ink)',
              margin: 0, lineHeight: '1.1',
            }}>
              <span className="text-gradient-pink-gold">{shop.name}</span>
            </h1>
            {/* Read-only chip */}
            <span style={{
              fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--color-plum-soft)',
              backgroundColor: 'rgba(61,42,74,0.07)',
              border: '1px solid rgba(61,42,74,0.14)',
              padding: '4px 10px', borderRadius: '100px',
            }}>
              Read only
            </span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
            {shop.location}&nbsp;·&nbsp;
            {shop.months_active === 0 ? 'New shop' : `${shop.months_active} months active`}
            &nbsp;·&nbsp;{shop.categories.join(', ')}
          </p>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="pipeline-content" style={{ maxWidth: '860px' }}>

        {/* ── Trust Standing ── */}
        <div className="result-card" style={{ marginBottom: '16px' }}>
          <p className="result-eyebrow" style={{ marginBottom: '14px' }}>Current Trust Standing</p>

          {currentScore != null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="trust-score-num" style={{ color: 'var(--color-meesho-pink)' }}>
                    {currentScore}
                  </span>
                  <span className="trust-score-denom">/100</span>
                </div>
                {latestAnalysis && <TrustBadge status={latestAnalysis.trust_status} />}
              </div>
              <TrustBar score={currentScore} />
              {latestAnalysis && (
                <p className="result-body">{latestAnalysis.trust_reason}</p>
              )}
            </>
          ) : (
            <p className="result-body">No analysis has been run for this shop yet.</p>
          )}
        </div>

        {/* ── Pending applications — awaiting review ── */}
        {pendingLoans.length > 0 && (
          <div className="result-card result-card--gold" style={{ marginBottom: '16px' }}>
            <div className="result-icon-row" style={{ marginBottom: '14px' }}>
              <div className="result-icon-chip" style={{ backgroundColor: 'var(--color-gold)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="result-eyebrow" style={{ color: 'var(--color-gold-dark)', margin: 0 }}>
                Awaiting Your Review
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {pendingLoans.map((loan, idx) => {
                const isExpanded = expandedLoanId === loan.id;
                const loanDetails = [
                  { label: 'Loan Amount',   value: `₹${loan.amount.toLocaleString('en-IN')}`,    color: 'var(--color-meesho-pink)', weight: '800' },
                  { label: 'Tenure',        value: `${loan.tenure_weeks} weeks`,                  color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Interest Tier', value: loan.interest_tier,                            color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Distributor',   value: loan.distributor_name,                         color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Applied',       value: new Date(loan.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--color-plum-soft)', weight: '600' },
                  ...(latestAnalysis ? [
                    { label: 'Trust Score',  value: `${latestAnalysis.trust_score}/100`,          color: 'var(--color-meesho-pink)', weight: '800' },
                    { label: 'Trust Status', value: latestAnalysis.trust_status,                  color: 'var(--color-plum-ink)',    weight: '700' },
                  ] : []),
                ];

                return (
                  <div key={loan.id} style={{ borderTop: idx > 0 ? '1px solid rgba(184,121,31,0.14)' : 'none', paddingTop: idx > 0 ? '14px' : 0, marginTop: idx > 0 ? '14px' : 0 }}>
                    {/* Main row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-plum-ink)', margin: '0 0 3px' }}>
                          <strong style={{ color: 'var(--color-meesho-pink)' }}>
                            ₹{loan.amount.toLocaleString('en-IN')}
                          </strong>
                          &nbsp;·&nbsp;{loan.tenure_weeks} weeks
                          &nbsp;·&nbsp;{loan.interest_tier} interest
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: 0 }}>
                          to {loan.distributor_name}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* View / Hide toggle */}
                        <button
                          onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                          style={{
                            padding: '7px 12px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: '700',
                            color: isExpanded ? 'var(--color-gold-dark)' : 'var(--color-plum-soft)',
                            backgroundColor: isExpanded ? 'rgba(184,121,31,0.12)' : 'rgba(61,42,74,0.06)',
                            border: `1px solid ${isExpanded ? 'rgba(184,121,31,0.28)' : 'rgba(61,42,74,0.14)'}`,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            transition: 'all 0.2s',
                          }}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <ActionButtons loan={loan} actingOn={actingOn} onDecision={handleDecision} />
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '14px', paddingTop: '14px',
                        borderTop: '1px solid rgba(184,121,31,0.14)',
                      }}>
                        <p style={{
                          fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
                          letterSpacing: '0.6px', color: 'var(--color-gold-dark)', margin: '0 0 12px',
                        }}>
                          Application Details
                        </p>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '12px 20px',
                        }}>
                          {loanDetails.map(({ label, value, color, weight }) => (
                            <div key={label}>
                              <p style={{
                                fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                                letterSpacing: '0.4px', color: 'var(--color-gold-dark)', margin: '0 0 4px', opacity: 0.7,
                              }}>
                                {label}
                              </p>
                              <p style={{ fontSize: '14px', fontWeight: weight, color, margin: 0 }}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                        {latestAnalysis?.trust_reason && (
                          <p style={{
                            fontSize: '12px', color: 'var(--color-plum-mid)', margin: '14px 0 0',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(255,255,255,0.55)',
                            borderRadius: '8px',
                            lineHeight: '1.6',
                          }}>
                            <strong style={{ color: 'var(--color-gold-dark)' }}>Trust reason: </strong>
                            {latestAnalysis.trust_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trust Score History ── */}
        <div style={{ marginBottom: '16px' }}>
          <p className="result-eyebrow" style={{ marginBottom: '14px' }}>
            Trust Score History
            {trustHistory.length > 0 && (
              <span style={{ fontWeight: '600', fontSize: '11px', color: 'var(--color-plum-faint)', marginLeft: '8px', textTransform: 'none', letterSpacing: 0 }}>
                · {trustHistory.length} event{trustHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>

          {trustHistory.length === 0 ? (
            <div className="result-card" style={{ padding: '18px 22px' }}>
              <p className="result-body" style={{ margin: 0 }}>No score changes recorded yet.</p>
            </div>
          ) : (
            <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Column headers */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(61,42,74,0.08)',
                backgroundColor: 'rgba(61,42,74,0.03)',
              }}>
                <span style={{ flex: 1, fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-plum-soft)' }}>
                  Reason
                </span>
                <span style={{ width: '90px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-plum-soft)', textAlign: 'right', flexShrink: 0 }}>
                  Date
                </span>
                <span style={{ width: '44px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-plum-soft)', textAlign: 'right', flexShrink: 0 }}>
                  Δ
                </span>
                <span style={{ width: '40px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-plum-soft)', textAlign: 'right', flexShrink: 0 }}>
                  Score
                </span>
              </div>

              {/* Rows — newest first */}
              {reversedHistory.map((entry, i) => {
                const prevEntry = reversedHistory[i + 1];
                const delta     = prevEntry != null ? entry.score - prevEntry.score : null;
                const scoreColor =
                  entry.score >= 70 ? '#1F6E5C'
                  : entry.score >= 40 ? 'var(--color-gold-dark)'
                  : '#B23B3B';

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 20px',
                      borderBottom: i < reversedHistory.length - 1
                        ? '1px solid rgba(61,42,74,0.06)'
                        : 'none',
                    }}
                  >
                    {/* Reason */}
                    <p style={{
                      flex: 1, fontSize: '13px',
                      color: 'var(--color-plum-mid)', margin: 0, lineHeight: '1.4',
                    }}>
                      {entry.reason}
                    </p>

                    {/* Date */}
                    <span style={{
                      width: '90px', fontSize: '11px',
                      color: 'var(--color-plum-soft)', textAlign: 'right', flexShrink: 0,
                    }}>
                      {new Date(entry.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>

                    {/* Delta */}
                    <span style={{
                      width: '44px', textAlign: 'right', flexShrink: 0,
                      fontSize: '11px', fontWeight: '800',
                      color: delta == null ? 'transparent'
                        : delta > 0 ? '#1F6E5C'
                        : delta < 0 ? '#B23B3B'
                        : 'var(--color-plum-soft)',
                    }}>
                      {delta == null ? '—'
                        : delta > 0 ? `+${delta}`
                        : delta}
                    </span>

                    {/* Score */}
                    <span style={{
                      width: '40px', textAlign: 'right', flexShrink: 0,
                      fontSize: '15px', fontWeight: '800', color: scoreColor,
                    }}>
                      {entry.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Loan History ── */}
        <div>
          <p className="result-eyebrow" style={{ marginBottom: '14px' }}>
            Loan History
            {loans.length > 0 && (
              <span style={{ fontWeight: '600', fontSize: '11px', color: 'var(--color-plum-faint)', marginLeft: '8px', textTransform: 'none', letterSpacing: 0 }}>
                · {loans.length} loan{loans.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>

          {loans.length === 0 ? (
            <div className="result-card" style={{ padding: '18px 22px' }}>
              <p className="result-body" style={{ margin: 0 }}>No loans applied for yet.</p>
            </div>
          ) : (
            <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>
              {loans.map((loan, i) => {
                const cfg = STATUS_MAP[loan.status] || STATUS_MAP.pending;
                const isHistExpanded = expandedHistoryLoanId === loan.id;
                const histDetails = [
                  { label: 'Loan Amount',   value: `₹${loan.amount.toLocaleString('en-IN')}`,      color: 'var(--color-meesho-pink)', weight: '800' },
                  { label: 'Tenure',        value: `${loan.tenure_weeks} weeks`,                    color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Interest Tier', value: loan.interest_tier || '—',                      color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Distributor',   value: loan.distributor_name || '—',                   color: 'var(--color-plum-ink)',    weight: '700' },
                  { label: 'Applied',       value: new Date(loan.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--color-plum-soft)', weight: '600' },
                  { label: 'Status',        value: cfg.label,                                       color: cfg.dot,                   weight: '700' },
                ];
                return (
                  <div key={loan.id}>
                    {/* Main row */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '16px',
                      padding: '14px 20px',
                      borderTop: i > 0 ? '1px solid rgba(61,42,74,0.06)' : 'none',
                    }}>
                      {/* Left: dot + amount/details */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '9px',
                          backgroundColor: cfg.dotBg, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px',
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.dot }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-plum-ink)', margin: '0 0 3px' }}>
                            ₹{loan.amount.toLocaleString('en-IN')}&nbsp;·&nbsp;{loan.tenure_weeks} weeks
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: 0 }}>
                            to {loan.distributor_name}&nbsp;·&nbsp;
                            applied {new Date(loan.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Right: View toggle + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => setExpandedHistoryLoanId(isHistExpanded ? null : loan.id)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: '700',
                            color: isHistExpanded ? 'var(--color-plum)' : 'var(--color-plum-soft)',
                            backgroundColor: isHistExpanded ? 'rgba(61,42,74,0.10)' : 'rgba(61,42,74,0.05)',
                            border: `1px solid ${isHistExpanded ? 'rgba(61,42,74,0.22)' : 'rgba(61,42,74,0.10)'}`,
                            cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.18s',
                          }}
                        >
                          {isHistExpanded ? 'Hide' : 'View'}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            style={{ transition: 'transform 0.18s', transform: isHistExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <LoanStatusBadge status={loan.status} />
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isHistExpanded && (
                      <div style={{
                        margin: '0 20px 14px',
                        padding: '14px 16px',
                        backgroundColor: 'rgba(61,42,74,0.03)',
                        border: '1px solid rgba(61,42,74,0.08)',
                        borderRadius: '10px',
                      }}>
                        <p style={{
                          fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
                          letterSpacing: '0.6px', color: 'var(--color-plum-soft)', margin: '0 0 12px',
                        }}>
                          Loan Details
                        </p>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '12px 20px',
                        }}>
                          {histDetails.map(({ label, value, color, weight }) => (
                            <div key={label}>
                              <p style={{
                                fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                                letterSpacing: '0.4px', color: 'var(--color-plum-soft)', margin: '0 0 4px',
                              }}>
                                {label}
                              </p>
                              <p style={{ fontSize: '13px', fontWeight: weight, color, margin: 0 }}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Write-off inline notice */}
                    {loan.status === 'loss_asset' && (
                      <div style={{
                        margin: '0 20px 14px',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(178,59,59,0.06)',
                        border: '1px solid rgba(178,59,59,0.16)',
                        borderLeft: '3px solid #B23B3B',
                        borderRadius: '8px',
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="#B23B3B" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
                        </svg>
                        <p style={{ fontSize: '12px', color: 'var(--color-plum-mid)', margin: 0, lineHeight: '1.6' }}>
                          <strong style={{ color: '#B23B3B' }}>Written off — not forgiven.</strong>{' '}
                          Handed to collections in production, reported to credit record, and recoverable at any time.
                        </p>
                      </div>
                    )}
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

export default ShopDetailAdmin;