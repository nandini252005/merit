import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

/* ─── Loan status badge ──────────────────────────────────────────── */

const STATUS_MAP = {
  pending:    { cls: 'shop-badge shop-badge--pending',   label: 'Pending Review' },
  active:     { cls: 'shop-badge shop-badge--active',    label: 'Active' },
  overdue:    { cls: 'shop-badge shop-badge--overdue',   label: 'Overdue' },
  defaulted:  { cls: 'shop-badge shop-badge--defaulted', label: 'Defaulted' },
  loss_asset: { cls: 'shop-badge shop-badge--defaulted', label: 'Written Off' },
  completed:  { cls: 'trust-badge trust-badge--strong',  label: 'Completed' },
  rejected:   { cls: 'shop-badge shop-badge--pending',   label: 'Rejected' },
};

function LoanStatusBadge({ status }) {
  const c = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={c.cls}>{c.label}</span>;
}

/* ─── Write-off notice ───────────────────────────────────────────── */

function WriteOffNotice({ amount }) {
  return (
    <div style={{
      marginTop: '16px',
      backgroundColor: 'rgba(178,59,59,0.06)',
      border: '1px solid rgba(178,59,59,0.18)',
      borderLeft: '3px solid #B23B3B',
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Warning icon chip */}
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '8px',
          backgroundColor: 'rgba(178,59,59,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#B23B3B" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
          </svg>
        </div>

        <div>
          {/* Amount line — prominent */}
          <p style={{
            fontSize: '13px', fontWeight: '800',
            color: '#B23B3B', margin: '0 0 6px',
          }}>
            ₹{amount.toLocaleString('en-IN')} written off as unrecoverable
          </p>

          {/* Explanation — clearly worded */}
          <p style={{
            fontSize: '12px', lineHeight: '1.65',
            color: 'var(--color-plum-mid)', margin: 0,
          }}>
            <strong style={{ color: 'var(--color-plum-ink)' }}>
              This is not debt forgiveness.
            </strong>{' '}
            A write-off is an accounting classification. Recovery through collections
            is still possible and the outstanding amount can be pursued at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Single loan card ───────────────────────────────────────────── */

function LoanCard({ loan, schedule }) {
  const paidCount       = schedule.filter((r) => r.status === 'paid').length;
  const missedCount     = schedule.filter((r) => r.status === 'missed').length;
  const remainingBalance = schedule
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount_due, 0);
  const progressPct = schedule.length > 0
    ? (paidCount / schedule.length) * 100
    : 0;
  const isCompleted = loan.status === 'completed';

  const formattedDate = new Date(loan.applied_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="result-card" style={{ marginBottom: '14px' }}>

      {/* ── Top row: id/date + amount + badge ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div>
          <p style={{
            fontSize: '11px', fontWeight: '700',
            color: 'var(--color-plum-soft)', margin: '0 0 6px',
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            Loan #{loan.id}&nbsp;·&nbsp;{formattedDate}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontSize: '30px', fontWeight: '800',
              letterSpacing: '-1px',
              color: isCompleted ? '#1F6E5C' : 'var(--color-plum-ink)',
              lineHeight: 1,
            }}>
              ₹{loan.amount.toLocaleString('en-IN')}
            </span>
          </div>
          {loan.distributor_name && (
            <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: '4px 0 0' }}>
              to {loan.distributor_name}
            </p>
          )}
        </div>
        <LoanStatusBadge status={loan.status} />
      </div>

      {/* ── Progress bar ── */}
      {schedule.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-plum-soft)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Repayment Progress
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-plum-soft)', margin: 0 }}>
              {paidCount} of {schedule.length} weeks paid
            </p>
          </div>
          <div className="trust-bar-track" style={{ marginBottom: '16px' }}>
            <div
              className="trust-bar-fill"
              style={{
                width: `${progressPct}%`,
                background: isCompleted
                  ? 'linear-gradient(90deg, #1F6E5C, #2E8B6F)'
                  : missedCount > 0
                  ? 'linear-gradient(90deg, var(--color-gold), #B23B3B)'
                  : 'linear-gradient(90deg, var(--color-meesho-pink), var(--color-gold))',
              }}
            />
          </div>
        </>
      )}

      {/* ── Stats row ── */}
      <div style={{
        display: 'flex', gap: '28px', flexWrap: 'wrap',
        paddingTop: '12px',
        borderTop: '1px solid rgba(61,42,74,0.06)',
      }}>
        {[
          {
            label: 'Duration',
            value: `${loan.tenure_weeks} weeks`,
            color: 'var(--color-plum-ink)',
          },
          {
            label: 'Weeks paid',
            value: `${paidCount}/${schedule.length}`,
            color: 'var(--color-meesho-pink)',
          },
          ...(missedCount > 0 ? [{
            label: 'Weeks missed',
            value: `${missedCount}`,
            color: '#B23B3B',
          }] : []),
          {
            label: 'Remaining',
            value: `₹${remainingBalance.toLocaleString('en-IN')}`,
            color: remainingBalance === 0 ? '#1F6E5C' : 'var(--color-gold-dark)',
          },
          {
            label: 'Interest tier',
            value: loan.interest_tier || '—',
            color: 'var(--color-plum-ink)',
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-plum-soft)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {label}
            </p>
            <p style={{ fontSize: '14px', fontWeight: '700', color, margin: 0 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Write-off notice ── */}
      {loan.loss_provisioned_amount > 0 && (
        <WriteOffNotice amount={loan.loss_provisioned_amount} />
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */

function ShopLoanHistory() {
  const { shopId } = useParams();
  const navigate   = useNavigate();

  const [shop,             setShop]             = useState(null);
  const [loans,            setLoans]            = useState([]);
  const [repaymentsByLoan, setRepaymentsByLoan] = useState({});
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    (async () => {
      const [shops, allLoans] = await Promise.all([
        api.getShops(),
        api.getAllLoans(),
      ]);
      const foundShop  = shops.find((s) => s.shop_id === shopId);
      const shopLoans  = allLoans.filter((l) => l.shop_id === shopId);
      setShop(foundShop);
      setLoans(shopLoans);

      const repaymentEntries = await Promise.all(
        shopLoans.map((l) =>
          api.getRepayments(l.id).then((r) => [l.id, r])
        )
      );
      setRepaymentsByLoan(Object.fromEntries(repaymentEntries));
      setLoading(false);
    })();
  }, [shopId]);

  /* ── Loading ── */
  if (loading || !shop) {
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
            <div className="skeleton-badge-row">
              <div className="skeleton-line skeleton-line--badge" />
              <div className="skeleton-line skeleton-line--badge2" />
            </div>
            <div className="skeleton-tag-row">
              {[70, 90, 60].map((w) => (
                <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Loan History
          </div>

          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
            letterSpacing: '-0.8px', color: 'var(--color-plum-ink)',
            margin: '0 0 6px', lineHeight: '1.1',
          }}>
            <span className="text-gradient-pink-gold">{shop.name}</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
            {shop.location}&nbsp;·&nbsp;
            {shop.months_active === 0 ? 'New shop' : `${shop.months_active} months active`}
            &nbsp;·&nbsp;{loans.length} loan{loans.length !== 1 ? 's' : ''} on record
          </p>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="pipeline-content" style={{ maxWidth: '860px' }}>

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
            <h2 className="analysis-idle-title">No loans yet</h2>
            <p className="analysis-idle-desc">
              This shop hasn't applied for any Merit credit yet. Run an analysis to see a loan offer.
            </p>
            <button
              className="run-analysis-btn"
              style={{ fontSize: '14px', padding: '12px 32px' }}
              onClick={() => navigate(`/shop-owner/${shopId}`)}
            >
              Go to shop →
            </button>
          </div>
        )}

        {/* Loan cards */}
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            schedule={repaymentsByLoan[loan.id] || []}
          />
        ))}
      </div>
    </div>
  );
}

export default ShopLoanHistory;