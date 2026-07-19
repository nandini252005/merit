import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopNav from '../components/layout/TopNav';
import { fmtCurrency, fmtDate } from '../utils/format';
import { STATUS_MAP, LoanStatusBadge } from '../components/shared/LoanStatusBadge';
import { ActionButtons } from '../components/shared/ActionButtons';

// Pending application card

// Pending application card

function PendingCard({ loan, isFlagged, actingOn, onDecision }) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const isActing = actingOn === loan.id;

  const runAnalysis = async () => {
    setAnalyzing(true);
    setExpanded(true);
    try {
      const res = await fetch(`http://localhost:5000/api/loans/${loan.id}/credit-analysis`, { method: 'POST' });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      alert("Analysis failed: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const detailItems = [
    { label: 'Loan Amount', value: fmtCurrency(loan.amount), color: 'var(--color-meesho-pink)', weight: '800' },
    { label: 'Tenure',      value: `${loan.tenure_weeks} weeks`,              color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Interest Tier', value: loan.interest_tier,                      color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Distributor', value: loan.distributor_name,                     color: 'var(--color-plum-ink)',    weight: '700' },
    { label: 'Applied',     value: fmtDate(loan.applied_at), color: 'var(--color-plum-soft)', weight: '600' },
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
            <strong style={{ color: 'var(--color-meesho-pink)' }}>{fmtCurrency(loan.amount)}</strong>
            &nbsp;·&nbsp;{loan.tenure_weeks} weeks
            &nbsp;·&nbsp;{loan.interest_tier} interest
            &nbsp;·&nbsp;to <strong style={{ color: 'var(--color-plum-ink)' }}>{loan.distributor_name}</strong>
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>

          <button
            onClick={runAnalysis}
            disabled={analyzing || isActing}
            style={{
              padding: '8px 14px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '800',
              color: 'var(--color-gold-dark)',
              backgroundColor: 'var(--color-gold-bg)',
              border: '1px solid rgba(184,121,31,0.22)',
              cursor: analyzing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
              opacity: (analyzing || isActing) ? 0.6 : 1
            }}
          >
            {analyzing ? (
              <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--color-gold-dark)', borderRightColor: 'var(--color-gold-dark)' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {analyzing ? 'Analyzing...' : 'Run Merit Analysis'}
          </button>

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

          <ActionButtons loan={loan} actingOn={actingOn} onDecision={onDecision} />
        </div>
      </div>

      {/* ── Expandable details panel ── */}
      {expanded && (
        <div style={{
          marginTop: '16px', paddingTop: '16px',
          borderTop: '1px solid rgba(61,42,74,0.08)',
        }}>
          
          {analyzing && (
             <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(61,42,74,0.03)', borderRadius: '12px', marginBottom: '16px' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', marginBottom: '12px', borderTopColor: 'var(--color-gold-dark)', borderRightColor: 'var(--color-gold-dark)' }} />
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-plum-mid)', fontWeight: '600' }}>Evaluating owner's portfolio across all shops...</p>
             </div>
          )}
          
          {analysis && !analyzing && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              borderRadius: '12px', 
              backgroundColor: analysis.recommendation === 'Approve' ? '#DCEFE8' : 'rgba(178,59,59,0.09)',
              border: analysis.recommendation === 'Approve' ? '1px solid #1F6E5C' : '1px solid #B23B3B'
            }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                 <div>
                   <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: analysis.recommendation === 'Approve' ? '#1F6E5C' : '#B23B3B', letterSpacing: '0.5px' }}>
                     AI Recommendation
                   </span>
                   <h4 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '800', color: analysis.recommendation === 'Approve' ? '#114035' : '#732525' }}>
                     {analysis.recommendation} Loan
                   </h4>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '10px', color: 'var(--color-plum-soft)', textTransform: 'uppercase', fontWeight: '700' }}>Confidence</span>
                   <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: '800', color: 'var(--color-plum-ink)' }}>{analysis.confidence}</p>
                 </div>
               </div>
               
               <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--color-plum-ink)', margin: '0 0 16px' }}>
                 {analysis.reasoning}
               </p>
               
               <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${analysis.recommendation === 'Approve' ? 'rgba(31,110,92,0.2)' : 'rgba(178,59,59,0.2)'}` }}>
                 <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: '700', color: 'var(--color-plum-soft)', textTransform: 'uppercase' }}>Owner Portfolio</p>
                   <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--color-plum-ink)' }}>{analysis.owner_context.shop_ids.length} Shops Owned</p>
                 </div>
                 <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: '700', color: 'var(--color-plum-soft)', textTransform: 'uppercase' }}>Blended Score</p>
                   <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--color-plum-ink)' }}>{analysis.owner_context.blended_score}/100</p>
                 </div>
                 <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: '700', color: 'var(--color-plum-soft)', textTransform: 'uppercase' }}>Total Missed</p>
                   <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: analysis.owner_context.total_missed_payments > 0 ? '#B23B3B' : '#1F6E5C' }}>{analysis.owner_context.total_missed_payments} Payments</p>
                 </div>
               </div>
            </div>
          )}

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

// Main dashboard

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
        <TopNav />
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
      <TopNav />

      {/* PAGE HEADER */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        <div className="hero-orb hero-orb--pink" />
        <div className="hero-orb hero-orb--gold" />

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

      {/* CONTENT */}
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
              {fmtCurrency(stats.total_disbursed)}
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
                      {fmtCurrency(loan.amount)}
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
                      {fmtDate(loan.applied_at)}
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