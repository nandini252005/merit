import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopNav from '../components/layout/TopNav';
import { fmtCurrency, fmtDate } from '../utils/format';
import { TrustBadge, TrustBar } from '../components/shared/TrustDisplay';

// STEP DEFINITIONS — real user-facing copy from the agent diagram

const STEPS = [
  {
    key: 'profile',
    label: 'Trust Score',
    activeText: 'Analysing order history & growth patterns...',
    doneText: 'Score computed',
    color: 'var(--color-meesho-pink)',
    glow: 'rgba(244,51,151,0.14)',
    chipBg: 'var(--color-pink-bg)',
    icon: (stroke) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'cluster',
    label: 'Nearby Shops',
    activeText: 'Scanning neighbours for cluster support...',
    doneText: 'Cluster checked',
    color: 'var(--color-gold)',
    glow: 'rgba(201,147,26,0.15)',
    chipBg: 'var(--color-gold-bg)',
    icon: (stroke) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'financing',
    label: 'Loan Offer',
    activeText: 'Calculating the right loan for your shop...',
    doneText: 'Offer ready',
    color: 'var(--color-plum)',
    glow: 'rgba(61,42,74,0.14)',
    chipBg: 'rgba(61,42,74,0.08)',
    icon: (stroke) => (
  <span
    style={{
      color: stroke,
      fontSize: "18px",
      fontWeight: 700,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
    }}
  >
    ₹
  </span>
),
  },
  {
    key: 'coaching',
    label: 'Your Advice',
    activeText: 'Crafting tips to grow your score & terms...',
    doneText: 'Advice ready',
    color: '#A6296B',
    glow: 'rgba(166,41,107,0.12)',
    chipBg: '#F5DCE9',
    icon: (stroke) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// STATUS COPY

const STATUS_COPY = {
  PENDING_REVIEW: {
    title: 'Application under review',
    desc: 'Your loan application is awaiting review by MPPL. Check back soon.',
    color: 'var(--color-gold-dark)',
    bg: 'var(--color-gold-bg)',
    border: 'rgba(184,121,31,0.22)',
    canRepay: false,
  },
  ACTIVE: {
    title: 'You have an active loan',
    desc: 'Track your repayment schedule and keep your trust score growing.',
    color: 'var(--color-plum)',
    bg: 'rgba(61,42,74,0.06)',
    border: 'rgba(61,42,74,0.16)',
    canRepay: true,
  },
  OVERDUE: {
    title: 'A repayment is overdue',
    desc: 'Catch up on your repayment to avoid further impact on your trust score.',
    color: '#B23B3B',
    bg: 'rgba(178,59,59,0.07)',
    border: 'rgba(178,59,59,0.20)',
    canRepay: true,
  },
  DEFAULTED: {
    title: 'Not eligible for new credit right now',
    desc: 'Your trust score needs to recover. Keep using Kirana Club consistently.',
    color: '#B23B3B',
    bg: 'rgba(178,59,59,0.07)',
    border: 'rgba(178,59,59,0.20)',
    canRepay: false,
  },
};

// MAIN COMPONENT

function ShopPipeline() {
  const { shopId } = useParams();
  const navigate   = useNavigate();

  const [shop,          setShop]          = useState(null);
  const [shopStatus,    setShopStatus]    = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status,        setStatus]        = useState('idle');   // idle | running | done | error
  const [stepIndex,     setStepIndex]     = useState(-1);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState(null);

  const loadContext = async () => {
    setStatusLoading(true);
    const [shops, shopStatusData] = await Promise.all([
      api.getShops(),
      api.getShopStatus(shopId),
    ]);
    setShop(shops.find((s) => s.shop_id === shopId));
    setShopStatus(shopStatusData);
    setStatusLoading(false);
  };

  useEffect(() => { loadContext(); }, [shopId]);

  const runAnalysis = async () => {
    setStatus('running');
    setResult(null);
    setError(null);

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const data = await api.analyzeShop(shopId);
      await new Promise((r) => setTimeout(r, 700 * STEPS.length));
      clearInterval(interval);
      setStepIndex(STEPS.length - 1);
      setResult(data);
      setStatus('done');
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
      setStatus('error');
    }
  };

  /* ── Loading skeleton ── */
  if (!shop || statusLoading) {
    return (
      <div className="merit-page">
        <TopNav />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div className="skeleton-card" style={{ width: '480px' }}>
            <div className="skeleton-card-header">
              <div className="skeleton-avatar" />
              <div className="skeleton-meta">
                <div className="skeleton-line skeleton-line--name" />
                <div className="skeleton-line skeleton-line--loc" />
              </div>
            </div>
            <div className="skeleton-badge-row">
              <div className="skeleton-line skeleton-line--badge" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const eligibility    = shopStatus?.eligibility;
  const canApply       = eligibility === 'NO_LOAN' || eligibility === 'COMPLETED_ELIGIBLE';
  const blockedInfo    = STATUS_COPY[eligibility];
  const showBanner     = shopStatus?.current_loan && blockedInfo && status === 'idle';

  /* Progress fill % for the stepper track */
  const fillPct = status === 'done'
    ? 75
    : Math.max(0, stepIndex) / (STEPS.length - 1) * 75;

  return (
    <div className="merit-page">

      {/* NAVBAR */}
      <TopNav />

      {/* PAGE HEADER */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        {/* Ambient blobs */}
        <div className="hero-orb hero-orb--pink" />
        <div className="hero-orb hero-orb--gold" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto' }}>
          {/* Back button */}
          <button className="back-btn" onClick={() => navigate('/shop-owner')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All shops
          </button>

          {/* Shop identity row */}
          <div className="page-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h1 style={{
                  fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
                  letterSpacing: '-0.8px', color: 'var(--color-plum-ink)', margin: 0,
                }}>
                  {shop.name}
                </h1>
                {shop.months_active === 0 && (
                  <span className="shop-badge shop-badge--new">NEW</span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0 }}>
                {shop.location}&nbsp;·&nbsp;
                {shop.months_active === 0 ? 'New shop' : `${shop.months_active} months active`}
                &nbsp;·&nbsp;{shop.categories.join(', ')}
              </p>
            </div>

            <button
              className="history-btn"
              onClick={() => navigate(`/shop-owner/${shopId}/history`)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View loan history
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="pipeline-content">

        {/* ── Status banner ── */}
        {showBanner && (
          <div
            className="status-banner"
            style={{ backgroundColor: blockedInfo.bg, border: `1px solid ${blockedInfo.border}` }}
          >
            <div>
              <p className="status-banner-title" style={{ color: blockedInfo.color }}>
                {blockedInfo.title}
              </p>
              <p className="status-banner-desc">{blockedInfo.desc}</p>
              {shopStatus.recovery_needed && (
                <p className="status-banner-note">{shopStatus.recovery_needed}</p>
              )}
            </div>
            {blockedInfo.canRepay && (
              <button
                className="status-banner-btn"
                style={{ backgroundColor: blockedInfo.color }}
                onClick={() => navigate(`/shop-owner/${shopId}/repayments`)}
              >
                View repayment schedule
              </button>
            )}
          </div>
        )}

        {/* ── IDLE — CTA card ── */}
        {status === 'idle' && (
          <div className="analysis-idle-card">
            <div className="analysis-idle-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
                  fill="white"
                />
              </svg>
            </div>

            <h2 className="analysis-idle-title">Ready to run Merit Analysis</h2>
            <p className="analysis-idle-desc">
              Four AI agents score your trust, check nearby shops, size a loan offer,
              and prepare personalised coaching — all in seconds.
            </p>

            {/* Agent pills */}
            <div className="analysis-agent-pills">
              {STEPS.map((s) => (
                <span
                  key={s.key}
                  className="analysis-agent-pill"
                  style={{
                    color: s.color,
                    backgroundColor: s.chipBg,
                    border: `1px solid ${s.glow.replace('0.1', '0.3').replace('0.14', '0.3').replace('0.15', '0.3').replace('0.12', '0.3')}`,
                  }}
                >
                  {s.label}
                </span>
              ))}
            </div>

            <button className="run-analysis-btn" onClick={runAnalysis}>
              Run Merit Analysis →
            </button>
          </div>
        )}

        {/* ── RUNNING / DONE — animated stepper ── */}
        {(status === 'running' || status === 'done') && (
          <div className="stepper-card">
            <div className="stepper-header">
              <div>
                <p className="stepper-label">Merit Analysis</p>
                <p className="stepper-title">
                  {status === 'running' ? 'Four agents working on your profile...' : '✓ Analysis complete'}
                </p>
              </div>
              {status === 'done' && (
                <span className="stepper-done-badge">Complete</span>
              )}
            </div>

            {/* Track + steps */}
            <div className="stepper-track-wrap">
              <div className="stepper-track-bg" />
              <div className="stepper-track-fill" style={{ width: `${fillPct}%` }} />

              <div className="stepper-steps">
                {STEPS.map((step, i) => {
                  const isActive = i === stepIndex && status === 'running';
                  const isDone   = i < stepIndex || status === 'done';

                  const circleStyle = {
                    backgroundColor: isDone
                      ? step.color
                      : isActive
                      ? step.chipBg
                      : 'rgba(61,42,74,0.07)',
                    border: `2px solid ${isDone ? step.color : isActive ? step.color : 'transparent'}`,
                    color: isDone ? 'white' : isActive ? step.color : 'rgba(61,42,74,0.25)',
                    /* CSS var for the glow keyframe */
                    '--step-glow': step.glow,
                  };

                  return (
                    <div key={step.key} className="step-col">
                      {/* Circle */}
                      <div
                        className={`step-circle${isActive ? ' step-circle--active' : ''}`}
                        style={circleStyle}
                      >
                        {isDone ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          step.icon(
                            isDone ? 'white' : isActive ? step.color : 'rgba(61,42,74,0.25)'
                          )
                        )}
                      </div>

                      {/* Label */}
                      <p
                        className="step-col-label"
                        style={{ color: isDone || isActive ? step.color : 'var(--color-plum-faint)' }}
                      >
                        {step.label}
                      </p>

                      {/* Status text */}
                      <p
                        className="step-col-status"
                        style={{
                          color: isActive
                            ? step.color
                            : isDone
                            ? 'var(--color-plum-soft)'
                            : 'transparent',
                        }}
                      >
                        {isDone
                          ? `✓ ${step.doneText}`
                          : isActive
                          ? step.activeText
                          : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div className="error-card" style={{ marginBottom: '24px' }}>
            <div className="error-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#B23B3B" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="error-title">Analysis failed</p>
              <p className="error-message">{error}</p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {status === 'done' && result && (
          <div className="result-grid">

            {/* Trust Score */}
            <div className="result-card">
              <div className="result-header-row">
                <p className="result-eyebrow">Trust Score</p>
                <TrustBadge status={result.profile.trust_status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '12px' }}>
                <span className="trust-score-num" style={{ color: 'var(--color-meesho-pink)' }}>
                  {result.profile.trust_score}
                </span>
                <span className="trust-score-denom">/100</span>
              </div>
              <TrustBar score={result.profile.trust_score} />
              <p className="result-body">{result.profile.trust_reason}</p>
            </div>

            {/* Loan Offer */}
            <div className="result-card">
              <p className="result-eyebrow" style={{ marginBottom: '12px' }}>Loan Offer</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                <span className="loan-amount">
                  {fmtCurrency(result.financing.loan_amount)}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-plum-soft)', margin: '0 0 10px' }}>
                {result.financing.loan_tenure}&nbsp;·&nbsp;{result.financing.loan_tier} interest
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-plum-mid)', margin: '0 0 20px', lineHeight: '1.5' }}>
                Need less? You can customise this amount during the application process.
              </p>
              {canApply ? (
                <button
                  className="apply-btn"
                  onClick={() => navigate(`/shop-owner/${shopId}/apply`, { state: { result } })}
                >
                  Apply for this loan →
                </button>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: 0, lineHeight: '1.6' }}>
                  For reference only — you already have{' '}
                  {eligibility === 'PENDING_REVIEW'
                    ? 'an application under review'
                    : 'an active or unresolved loan'}.
                </p>
              )}
            </div>

            {/* Cluster — full width, conditional */}
            {result.cluster?.cluster_used && (
              <div className="result-card result-card--gold" style={{ gridColumn: '1 / -1' }}>
                <div className="result-icon-row">
                  <div className="result-icon-chip" style={{ backgroundColor: 'var(--color-gold)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="result-eyebrow" style={{ color: 'var(--color-gold-dark)' }}>
                    Cluster Trust Applied
                  </p>
                </div>
                <p className="result-body">{result.cluster.cluster_explanation}</p>
              </div>
            )}

            {/* Coaching — full or half width depending on cluster */}
            <div
              className="result-card result-card--coaching"
              style={{ gridColumn: result.cluster?.cluster_used ? 'auto' : '1 / -1' }}
            >
              <div className="result-icon-row">
                <div className="result-icon-chip" style={{ backgroundColor: '#A6296B' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="result-eyebrow" style={{ color: '#A6296B' }}>
                  Coaching Advice
                </p>
              </div>
              <p className="result-body">{result.coaching.coaching_message}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default ShopPipeline;