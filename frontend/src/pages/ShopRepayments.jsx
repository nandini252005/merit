import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopNav from '../components/layout/TopNav';
import { fmtCurrency } from '../utils/format';
import { LoanStatusBadge } from '../components/shared/LoanStatusBadge';

const GRACE_LIMIT = 4;

// Per-row config
const ROW_STATUS = {
  paid:    { label: '✓ Paid',    color: '#1F6E5C',                    bg: '#DCEFE8' },
  missed:  { label: '✗ Missed',  color: '#B23B3B',                    bg: 'rgba(178,59,59,0.09)' },
  pending: { label: 'Upcoming',  color: 'var(--color-plum-faint)',    bg: 'rgba(61,42,74,0.06)' },
};

function DecisionPendingRow({ repayment, loanId, onResolved }) {
  const [preview, setPreview] = useState(null);
  const [showGraceConfirm, setShowGraceConfirm] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    api.gracePreview(loanId).then(setPreview).catch(() => {});
  }, [loanId]);

  const handlePayFull = async () => {
    setActing(true);
    try {
      await api.simulateRepayment(repayment.id, 'paid');
      await onResolved();
    } catch (e) {
      alert(e.message);
    } finally {
      setActing(false);
    }
  };

  const handleConfirmGrace = async () => {
    setActing(true);
    try {
      await api.enterGraceSmoothing(loanId);
      await onResolved();
    } catch (e) {
      alert(e.message);
    } finally {
      setActing(false);
    }
  };

  return (
    <div style={{ padding: '16px 20px', backgroundColor: 'rgba(201,147,26,0.05)', borderLeft: '3px solid var(--color-gold, #C9931A)' }}>
      <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-plum-ink)', marginBottom: '4px' }}>
        Final Payment — {fmtCurrency(repayment.amount_due)}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', marginBottom: '14px' }}>
        This final amount is higher than usual. Pay it in full now, or spread it across a grace period.
      </p>

      {!showGraceConfirm ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handlePayFull}
            disabled={acting}
            className="apply-btn"
            style={{ width: 'auto', padding: '10px 18px', opacity: acting ? 0.7 : 1 }}
          >
            Pay full {fmtCurrency(repayment.amount_due)} now
          </button>
          <button
            onClick={() => setShowGraceConfirm(true)}
            disabled={acting || !preview}
            style={{
              padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
              color: 'var(--color-gold-dark, #8A6A14)', backgroundColor: 'white',
              border: '1.5px solid var(--color-gold-dark, #8A6A14)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', opacity: acting ? 0.7 : 1,
            }}
          >
            Enter grace period instead
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', border: '1px solid rgba(201,147,26,0.3)' }}>
          {preview ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--color-plum-ink)', marginBottom: '10px' }}>
                This adds <strong>{0}% interest for this demo</strong> and splits the balance across{' '}
                <strong>{preview.grace_week_count} grace week{preview.grace_week_count !== 1 ? 's' : ''}</strong> at{' '}
                <strong>{fmtCurrency(preview.per_week_amount)}/week</strong> (total {fmtCurrency(preview.total_with_interest)}).
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleConfirmGrace}
                  disabled={acting}
                  className="apply-btn"
                  style={{ width: 'auto', padding: '9px 16px', opacity: acting ? 0.7 : 1 }}
                >
                  {acting ? 'Working...' : 'Confirm — enter grace period'}
                </button>
                <button
                  onClick={() => setShowGraceConfirm(false)}
                  disabled={acting}
                  style={{
                    padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    color: 'var(--color-plum-soft)', backgroundColor: 'transparent',
                    border: '1px solid var(--color-border, #E8E6EA)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)' }}>Loading terms...</p>
          )}
        </div>
      )}
    </div>
  );
}

// Main component

function ShopRepayments() {
  const { shopId } = useParams();
  const navigate   = useNavigate();

  const [loan,       setLoan]       = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState(false);
  const [customPay,  setCustomPay]  = useState({});

  const load = async () => {
    const status = await api.getShopStatus(shopId);
    if (!status.current_loan) { setLoading(false); return; }
    setLoan(status.current_loan);
    const schedule = await api.getRepayments(status.current_loan.id);
    setRepayments(schedule);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopId]);

 const handleSimulate = async (repaymentId, outcome, paidAmount) => {
  setActing(true);
  try {
    await api.simulateRepayment(repaymentId, outcome, paidAmount);
    await load();
  } catch (e) {
    alert(e.message);
  } finally {
    setActing(false);
  }
};

  const handleGraceTick = async () => {
    setActing(true);
    try   { await api.graceTick(loan.id); await load(); }
    catch (e) { alert(e.message); }
    finally   { setActing(false); }
  };

  const handleSettleGrace = async () => {
    setActing(true);
    try   { await api.settleGrace(loan.id); await load(); }
    catch (e) { alert(e.message); }
    finally   { setActing(false); }
  };

  // Loading
  if (loading) {
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
              {[80, 100, 70].map((w) => (
                <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No loan
  if (!loan) {
    return (
      <div className="merit-page">
        <TopNav />
        <div className="pipeline-content" style={{ maxWidth: '680px', paddingTop: '40px' }}>
          <div className="error-card">
            <div className="error-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B23B3B" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="error-title">No active loan</p>
              <p className="error-message" style={{ marginBottom: '16px' }}>
                This shop doesn't have a current loan to track.
              </p>
              <button
                className="apply-btn"
                style={{ width: 'auto', padding: '10px 20px', display: 'inline-block' }}
                onClick={() => navigate(`/shop-owner/${shopId}`)}
              >
                Back to shop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derived values
  const nextActionable  = repayments.find((r) => r.status === 'pending');
  const paidWeeks       = repayments.filter((r) => r.status === 'paid').length;
  const missedWeeks     = repayments.filter((r) => r.status === 'missed').length;
  const totalPaid       = repayments.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount_due, 0);
  const remainingBalance = loan.amount - totalPaid;
  const totalWeeks      = loan.tenure_weeks || repayments.length;
  const progressPct     = loan.amount > 0 ? Math.min((totalPaid / loan.amount) * 100, 100) : 0;
  const isGrace         = loan.status === 'overdue_final';
  const isTerminal      = ['completed', 'loss_asset'].includes(loan.status);
  const totalPendingDue = repayments.filter(r => r.status === 'pending' || r.status === 'decision_pending').reduce((sum, r) => sum + r.amount_due, 0);
  const maxPayable      = isGrace ? totalPendingDue : remainingBalance;

  return (
    <div className="merit-page">
      <TopNav />

      {/* PAGE HEADER */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        <div className="hero-orb hero-orb--pink" />
        <div className="hero-orb hero-orb--gold" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto' }}>
          <button className="back-btn" onClick={() => navigate(`/shop-owner/${shopId}`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to shop
          </button>

          <div className="page-label" style={{ marginBottom: '14px' }}>
            <span className="page-label-dot" />
            Repayment Schedule
          </div>

          <div className="page-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
                  letterSpacing: '-0.8px', color: 'var(--color-plum-ink)', margin: 0,
                }}>
                  Loan Repayments
                </h1>
                <LoanStatusBadge status={loan.status} />
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
                {fmtCurrency(loan.amount)}&nbsp;·&nbsp;to&nbsp;
                <strong style={{ color: 'var(--color-plum-ink)' }}>{loan.distributor_name}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="pipeline-content" style={{ maxWidth: '860px' }}>

        {/* Summary chips */}
        {!isGrace && (
          <div className="stat-chip-row" style={{ marginBottom: '20px' }}>
            <div className="stat-chip">
              <span className="stat-chip-value" style={{ color: 'var(--color-meesho-pink)' }}>
                {fmtCurrency(remainingBalance)}
              </span>
              <span className="stat-chip-label">Remaining balance</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-value">
                {paidWeeks}/{totalWeeks}
              </span>
              <span className="stat-chip-label">Weeks paid</span>
            </div>
            {missedWeeks > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: '#B23B3B' }}>
                  {missedWeeks}
                </span>
                <span className="stat-chip-label">Weeks missed</span>
              </div>
            )}
            {loan.loss_provisioned_amount > 0 && (
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ color: '#B23B3B', fontSize: '16px' }}>
                  {fmtCurrency(loan.loss_provisioned_amount)}
                </span>
                <span className="stat-chip-label">Written off</span>
              </div>
            )}
          </div>
        )}
        
        {/* Sell-through explanation */}
        <div className="result-card" style={{ backgroundColor: 'rgba(31,110,92,0.05)', borderColor: 'rgba(31,110,92,0.15)', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: 0, lineHeight: '1.6' }}>
Weekly repayment amounts are calibrated using the merchant's reorder frequency rather than profit or loss. MERIT's Sell-Through Agent estimates repayment capacity based on how consistently the shop replenishes inventory. In production, this signal would be derived from Kirana Club's real reorder data.
          </p>
        </div>

        {/* Defaulted Notice */}
        {loan.status === 'defaulted' && (
          <div
            className="result-card"
            style={{
              backgroundColor: 'rgba(178,59,59,0.06)',
              borderColor: 'rgba(178,59,59,0.18)',
              marginBottom: '20px',
            }}
          >
            <div className="result-icon-row">
              <div className="result-icon-chip" style={{ backgroundColor: 'rgba(178,59,59,0.15)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B23B3B" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
                </svg>
              </div>
              <p className="result-eyebrow" style={{ color: '#B23B3B' }}>
                Loan Defaulted
              </p>
            </div>
            <p className="result-body">
              This loan has defaulted due to repeated missed payments or failure to settle the final grace period. In a production environment, this triggers a collections process and severely restricts the shop's future credit access.
            </p>
          </div>
        )}

        {/* Grace period — outstanding balance card */}
        {isGrace && (
          <>
            <div className="result-card result-card--gold" style={{ marginBottom: '12px' }}>
              <div className="result-icon-row">
                <div className="result-icon-chip" style={{ backgroundColor: 'var(--color-gold)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="result-eyebrow" style={{ color: 'var(--color-gold-dark)' }}>
                  Grace Period — Final Payment Overdue
                </p>
              </div>

              <p className="result-body" style={{ marginBottom: '16px' }}>
                Your last scheduled payment was missed. The outstanding balance now accrues{' '}
                <strong style={{ color: 'var(--color-gold-dark)' }}>0% penalty interest(for this demo)</strong>{' '}
                each week until it's settled. You have{' '}
                <strong style={{ color: 'var(--color-gold-dark)' }}>
                  {GRACE_LIMIT - loan.grace_weeks_elapsed} week
                  {GRACE_LIMIT - loan.grace_weeks_elapsed !== 1 ? 's' : ''}
                </strong>{' '}
                left before this loan is written off.
              </p>

              {/* Outstanding balance */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1.2px', color: '#B23B3B', lineHeight: 1 }}>
                  {fmtCurrency(loan.outstanding_balance)}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-plum-soft)' }}>outstanding</span>
              </div>

              {/* Grace week progress bar */}
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-gold-dark)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Grace week {loan.grace_weeks_elapsed} of {GRACE_LIMIT}
              </p>
              <div className="trust-bar-track" style={{ marginBottom: '20px' }}>
                <div
                  className="trust-bar-fill"
                  style={{
                    width: `${(loan.grace_weeks_elapsed / GRACE_LIMIT) * 100}%`,
                    background: 'linear-gradient(90deg, var(--color-gold), #B23B3B)',
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSettleGrace}
                  disabled={acting}
                  className="apply-btn"
                  style={{ width: 'auto', flex: '1 1 auto', padding: '11px 20px', opacity: acting ? 0.7 : 1 }}
                >
                  Pay full outstanding balance
                </button>
                <button
                  onClick={handleGraceTick}
                  disabled={acting}
                  style={{
                    flex: '1 1 auto',
                    padding: '11px 20px',
                    borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700',
                    color: 'var(--color-gold-dark)',
                    backgroundColor: 'white',
                    border: '1.5px solid var(--color-gold-dark)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    opacity: acting ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {acting ? 'Working...' : 'Simulate: week passes unpaid'}
                </button>
              </div>
            </div>

            {/* Warning card */}
            <div
              className="result-card"
              style={{
                backgroundColor: 'rgba(178,59,59,0.06)',
                borderColor: 'rgba(178,59,59,0.18)',
                marginBottom: '20px',
              }}
            >
              <div className="result-icon-row">
                <div className="result-icon-chip" style={{ backgroundColor: 'rgba(178,59,59,0.15)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B23B3B" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="result-eyebrow" style={{ color: '#B23B3B' }}>
                  What happens if this isn't settled
                </p>
              </div>
              <p className="result-body">
                After {GRACE_LIMIT} unpaid grace weeks this loan is formally written off as a loss
                asset. In production it would be handed to a collections process, reported to the
                shop's credit record, and could still be recovered later.
              </p>
            </div>
          </>
        )}

        {/* Repayment schedule card (compact rows) */}
        {!isGrace && repayments.length > 0 && (
          <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Card header with progress bar */}
            <div style={{ padding: '18px 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p className="result-eyebrow">
                  Schedule — {totalWeeks} weeks
                </p>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-plum-soft)', margin: 0 }}>
                  {paidWeeks}/{totalWeeks} weeks paid
                </p>
              </div>
              {/* Progress bar */}
              <div className="trust-bar-track" style={{ margin: 0 }}>
                <div
                  className="trust-bar-fill"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct >= 100
                      ? 'linear-gradient(90deg, #1F6E5C, #2E8B6F)'
                      : 'linear-gradient(90deg, var(--color-meesho-pink), var(--color-gold))',
                  }}
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'rgba(61,42,74,0.07)' }} />

            {/* Rows */}
            {repayments.map((r, idx) => {
              if (r.status === 'decision_pending') {
                return (
                  <DecisionPendingRow
                    key={r.id}
                    repayment={r}
                    loanId={loan.id}
                    onResolved={load}
                  />
                );
              }

              const isNext    = nextActionable && r.id === nextActionable.id && !isTerminal;
              const isLocked  = r.status === 'pending' && !isNext;
              const rowCfg    = ROW_STATUS[r.status] || ROW_STATUS.pending;

              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 20px',
                    borderBottom: idx < repayments.length - 1
                      ? '1px solid rgba(61,42,74,0.06)'
                      : 'none',
                    opacity: isLocked ? 0.38 : 1,
                    backgroundColor: isNext ? 'rgba(244,51,151,0.03)' : 'transparent',
                    borderLeft: isNext
                      ? '3px solid var(--color-meesho-pink)'
                      : '3px solid transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {/* Left: week chip + label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Week number chip */}
                    <div style={{
                      width: '34px', height: '34px',
                      borderRadius: '9px',
                      backgroundColor: rowCfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '800',
                      color: rowCfg.color,
                      flexShrink: 0,
                    }}>
                      {r.week_number}
                    </div>

                    <div>
                      <p style={{
                        fontSize: '14px', fontWeight: '700',
                        color: isLocked ? 'var(--color-plum-soft)' : 'var(--color-plum-ink)',
                        margin: 0, lineHeight: '1.2',
                      }}>
                        Week {r.week_number}
                      </p>
                      {isLocked ? (
                        <p style={{ fontSize: '11px', color: 'var(--color-plum-faint)', margin: 0 }}>
                          Locked — resolve earlier weeks first
                        </p>
                      ) : r.sell_through_pct != null && (
                        <p style={{ fontSize: '11px', color: 'var(--color-plum-faint)', margin: 0 }}>
                          {r.sell_through_pct}% of stock sold (will be calibrated through re-order frequency in production)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + action or badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      fontSize: '14px', fontWeight: '700',
                      color: isLocked ? 'var(--color-plum-soft)' : 'var(--color-plum-ink)',
                    }}>
                      {fmtCurrency(r.amount_due)}
                    </span>

                    {isNext ? (
                      acting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-plum-soft)', fontSize: '11px', fontStyle: 'italic', textAlign: 'right', maxWidth: '200px', lineHeight: '1.3' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                            <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
                          </svg>
                          Agent collecting stock sales progress & calculating next payable amount...
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-plum-soft)' }}>Pay: ₹</span>
                            <input
                              type="number"
                              min="1"
                              value={customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due}
                              onChange={(e) => setCustomPay({ ...customPay, [r.id]: e.target.value })}
                              style={{
                                width: '70px', padding: '5px 8px', borderRadius: '8px',
                                border: '1px solid rgba(61,42,74,0.15)', textAlign: 'right',
                                fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)',
                                color: 'var(--color-plum-ink)', outline: 'none'
                              }}
                            />
                            {/* Mark Missed */}
                            <button
                              onClick={() => handleSimulate(r.id, 'missed')}
                              disabled={acting}
                              style={{
                                padding: '6px 12px', borderRadius: '8px',
                                fontSize: '12px', fontWeight: '700',
                                color: '#B23B3B',
                                backgroundColor: 'rgba(178,59,59,0.09)',
                                border: '1px solid rgba(178,59,59,0.20)',
                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                transition: 'all 0.2s',
                              }}
                            >
                              ✗ Miss
                            </button>
                            {/* Mark Paid */}
                            <button
                              onClick={() => {
                                const amt = Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due);
                                handleSimulate(r.id, 'paid', amt);
                              }}
                              disabled={
                                acting || 
                                Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) <= 0 ||
                                Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) > maxPayable
                              }
                              style={{
                                padding: '6px 12px', borderRadius: '8px',
                                fontSize: '12px', fontWeight: '700',
                                color: 'white', backgroundColor: '#1F6E5C',
                                border: 'none', cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                                boxShadow: '0 2px 8px rgba(31,110,92,0.28)',
                                transition: 'all 0.2s',
                                opacity: (Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) <= 0 || Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) > maxPayable) ? 0.5 : 1
                              }}
                            >
                              ✓ Pay
                            </button>
                          </div>
                          
                          {/* Warnings */}
                          {Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) < r.amount_due && (
                            <span style={{ fontSize: '10px', color: '#B23B3B', maxWidth: '240px', textAlign: 'right', lineHeight: '1.2' }}>
                              Warning: Paying less than the recommended {fmtCurrency(r.amount_due)} will increase future payments and may make them harder to afford.
                            </span>
                          )}
                          {Number(customPay[r.id] !== undefined ? customPay[r.id] : r.amount_due) > maxPayable && (
                            <span style={{ fontSize: '10px', color: '#B23B3B', maxWidth: '240px', textAlign: 'right', lineHeight: '1.2' }}>
                              Cannot pay more than the total remaining balance ({fmtCurrency(maxPayable)}).
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      <span style={{
                        fontSize: '11px', fontWeight: '700',
                        color: rowCfg.color,
                        backgroundColor: rowCfg.bg,
                        padding: '3px 10px', borderRadius: '100px',
                        whiteSpace: 'nowrap',
                      }}>
                        {rowCfg.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default ShopRepayments;