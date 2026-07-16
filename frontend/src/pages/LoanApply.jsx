import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import TopNav from '../components/layout/TopNav';
/* ─── Main component ────────────────────────────────────────────── */

function LoanApply() {
  const { shopId }   = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();

  const [result,        setResult]        = useState(location.state?.result || null);
  const [loadingResult, setLoadingResult] = useState(!location.state?.result);
  const [distributorName, setDistributorName] = useState('');
  const [inputFocused,  setInputFocused]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    if (result) return;
    api.getShopAnalyses(shopId).then((analyses) => {
      if (analyses.length > 0) {
        const latest = analyses[0];
        setResult({
          analysis_id: latest.id,
          shop:        latest.shop_name,
          shop_id:     latest.shop_id,
          profile: {
            trust_score:  latest.trust_score,
            trust_status: latest.trust_status,
            trust_reason: latest.trust_reason,
          },
          cluster: {
            cluster_used:        !!latest.cluster_used,
            cluster_explanation: latest.cluster_explanation,
          },
          financing: {
            loan_amount:  latest.loan_amount,
            loan_tenure:  latest.loan_tenure,
            loan_tier:    latest.loan_tier,
          },
          coaching: { coaching_message: latest.coaching_message },
        });
      }
      setLoadingResult(false);
    });
  }, [shopId, result]);

  const tenureWeeks = parseInt(result?.financing?.loan_tenure, 10) || 6;

  const handleSubmit = async () => {
    if (!distributorName.trim()) {
      setError('Please enter a distributor name for this restock order.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.applyForLoan({
        analysis_id:    result.analysis_id,
        shop_id:        result.shop_id,
        shop_name:      result.shop,
        amount:         result.financing.loan_amount,
        tenure_weeks:   tenureWeeks,
        interest_tier:  result.financing.loan_tier,
        distributor_name: distributorName.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ══ Loading ══ */
  if (loadingResult) {
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
              <div className="skeleton-line skeleton-line--badge2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══ No analysis found ══ */
  if (!result) {
    return (
      <div className="merit-page">
        <TopNav />
        <div className="pipeline-content" style={{ maxWidth: '680px', display: 'flex', alignItems: 'flex-start', paddingTop: '40px' }}>
          <div className="error-card">
            <div className="error-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B23B3B" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="error-title">No analysis found</p>
              <p className="error-message" style={{ marginBottom: '16px' }}>
                Please run Merit Analysis before applying for a loan.
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

  /* ══ Success state ══ */
  if (submitted) {
    return (
      <div className="merit-page">
       <TopNav />
        <div
          className="pipeline-content"
          style={{ maxWidth: '680px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '60px' }}
        >
          <div className="analysis-idle-card" style={{ width: '100%' }}>
            {/* Green success icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              backgroundColor: '#DCEFE8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(31,110,92,0.20)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#1F6E5C" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="analysis-idle-title">
              Application{' '}
              <span className="text-gradient-pink-gold">submitted!</span>
            </h2>

            <p className="analysis-idle-desc">
              Your{' '}
              <strong style={{ color: 'var(--color-plum-ink)' }}>
                ₹{result.financing.loan_amount.toLocaleString('en-IN')}
              </strong>{' '}
              application is awaiting MPPL review. You'll be notified once a Credit Officer approves it.
            </p>

            {/* Confirmation chips */}
            <div className="stat-chip-row" style={{ justifyContent: 'center', marginBottom: '32px' }}>
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ fontSize: '16px' }}>
                  ₹{result.financing.loan_amount.toLocaleString('en-IN')}
                </span>
                <span className="stat-chip-label">Loan amount</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-value" style={{ fontSize: '16px', color: 'var(--color-gold-dark)' }}>
                  {result.financing.loan_tenure}
                </span>
                <span className="stat-chip-label">Tenure</span>
              </div>
            </div>

            <button
              className="run-analysis-btn"
              onClick={() => navigate('/shop-owner')}
            >
              Back to shops
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══ Main form ══ */
  return (
    <div className="merit-page">
      <TopNav />

      {/* ── Page header ── */}
      <div className="hero-bg page-header" style={{ padding: '36px 56px 32px' }}>
        {/* Ambient glow */}
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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
          <button className="back-btn" onClick={() => navigate(`/shop-owner/${shopId}`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to shop
          </button>

          {/* Label pill */}
          <div className="page-label" style={{ marginBottom: '14px' }}>
            <span className="page-label-dot" />
            Loan Application
          </div>

          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '800',
            letterSpacing: '-0.8px', color: 'var(--color-plum-ink)',
            margin: '0 0 8px', lineHeight: '1.1',
          }}>
            Apply for{' '}
            <span className="text-gradient-pink-gold">credit</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-plum-mid)', margin: 0, lineHeight: '1.6' }}>
            Merit pays your distributor directly — funds go toward stock, not your account.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pipeline-content" style={{ maxWidth: '736px' }}>

        {/* Offer summary card */}
        <div className="result-card" style={{ marginBottom: '16px' }}>
          <p className="result-eyebrow" style={{ marginBottom: '16px' }}>Offer Summary</p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
            <span className="loan-amount" style={{ color: 'var(--color-meesho-pink)' }}>
              ₹{result.financing.loan_amount.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="result-body" style={{ marginBottom: '20px' }}>
            {result.financing.loan_tenure}&nbsp;·&nbsp;{result.financing.loan_tier} interest tier
          </p>

          {/* 3 summary chips */}
          <div className="stat-chip-row" style={{ marginTop: 0 }}>
            <div className="stat-chip">
              <span className="stat-chip-value">
                ₹{result.financing.loan_amount.toLocaleString('en-IN')}
              </span>
              <span className="stat-chip-label">Loan amount</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-value" style={{ color: 'var(--color-gold-dark)', fontSize: '16px' }}>
                {result.financing.loan_tenure}
              </span>
              <span className="stat-chip-label">Tenure</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-value" style={{ color: 'var(--color-plum)', fontSize: '16px' }}>
                {result.financing.loan_tier}
              </span>
              <span className="stat-chip-label">Interest tier</span>
            </div>
          </div>
        </div>

        {/* Distributor form card */}
        <div className="result-card">
          {/* Icon + label */}
          <div className="result-icon-row">
            <div className="result-icon-chip" style={{ backgroundColor: 'var(--color-pink-bg)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-meesho-pink)" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" />
              </svg>
            </div>
            <p className="result-eyebrow" style={{ color: 'var(--color-plum)' }}>
              Distributor Details
            </p>
          </div>

          {/* Question */}
          <label style={{
            display: 'block',
            fontSize: '14px', fontWeight: '700',
            color: 'var(--color-plum-ink)',
            margin: '0 0 10px',
          }}>
            Which distributor is this restock order for?
          </label>

          {/* Input */}
          <input
            type="text"
            value={distributorName}
            onChange={(e) => { setDistributorName(e.target.value); setError(null); }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="e.g. Sharma FMCG Distributors, Kanpur"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `1.5px solid ${inputFocused ? 'var(--color-meesho-pink)' : 'rgba(61,42,74,0.20)'}`,
              boxShadow: inputFocused ? '0 0 0 3px rgba(244,51,151,0.10)' : 'none',
              backgroundColor: 'white',
              fontSize: '14px',
              color: 'var(--color-plum-ink)',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              marginBottom: '8px',
            }}
          />

          <p style={{ fontSize: '12px', color: 'var(--color-plum-soft)', margin: '0 0 24px', lineHeight: '1.6' }}>
            Merit disburses funds directly to this distributor — not to your account.
          </p>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(178,59,59,0.07)',
              border: '1px solid rgba(178,59,59,0.20)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B23B3B" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: '13px', color: '#B23B3B', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            className="run-analysis-btn"
            style={{ width: '100%', fontSize: '15px', padding: '14px 20px', opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
                </svg>
                Submitting...
              </span>
            ) : 'Submit application →'}
          </button>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LoanApply;