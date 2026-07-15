import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

/* ─── Status config ─────────────────────────────────────────────── */

const STATUS_CONFIG = {
  ACTIVE:         { label: 'Active Loan' },
  OVERDUE:        { label: 'Repayment Overdue' },
  DEFAULTED:      { label: 'Defaulted' },
  PENDING_REVIEW: { label: 'Application Pending' },
};

/* Badge class suffix maps to CSS .shop-badge--<variant> */
const STATUS_BADGE_VARIANT = {
  ACTIVE:         'active',
  OVERDUE:        'overdue',
  DEFAULTED:      'defaulted',
  PENDING_REVIEW: 'pending',
};

/* Colour palette cycles for the letter-avatar chip */
const CHIP_PALETTE = [
  { color: 'var(--color-meesho-pink)', bg: 'var(--color-pink-bg)'    },
  { color: 'var(--color-gold-dark)',   bg: 'var(--color-gold-bg)'    },
  { color: 'var(--color-plum)',        bg: 'rgba(61,42,74,0.10)'     },
  { color: '#1F6E5C',                  bg: '#DCEFE8'                  },
];

function chipFor(shopId) {
  return CHIP_PALETTE[shopId.charCodeAt(shopId.length - 1) % CHIP_PALETTE.length];
}

/* ─── Skeleton card ─────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="skeleton-card">
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
        {[60, 80, 50].map((w) => (
          <div key={w} className="skeleton-line skeleton-line--tag" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Shop card ─────────────────────────────────────────────────── */

function ShopCard({ shop, status, onClick }) {
  const isNew  = shop.months_active === 0;
  const sc     = status && STATUS_CONFIG[status.eligibility];
  const chip   = chipFor(shop.shop_id);
  const badge  = status && STATUS_BADGE_VARIANT[status.eligibility];

  return (
    <div className="shop-card" onClick={onClick}>
      {/* Left accent bar — colour dynamic, rest is CSS */}
      <div className="shop-accent-bar" style={{ background: chip.color }} />

      {/* Header row */}
      <div className="shop-card-header">
        <div className="shop-card-identity">
          {/* Letter avatar — only colour values are dynamic */}
          <div
            className="shop-initial-chip"
            style={{ color: chip.color, backgroundColor: chip.bg }}
          >
            {shop.name.charAt(0).toUpperCase()}
          </div>

          <div className="shop-card-meta">
            <h3 className="shop-card-name">{shop.name}</h3>
            <p className="shop-card-location">
              {shop.location}&nbsp;·&nbsp;
              {isNew ? 'New shop' : `${shop.months_active} months active`}
            </p>
          </div>
        </div>

        {/* Arrow chip — CSS handles hover colour flip via .shop-card:hover .shop-arrow-chip */}
        <div className="shop-arrow-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Badge row — only rendered when needed */}
      {(isNew || sc) && (
        <div className="shop-badge-row">
          {isNew && <span className="shop-badge shop-badge--new">NEW</span>}
          {sc && badge && (
            <span className={`shop-badge shop-badge--${badge}`}>{sc.label}</span>
          )}
        </div>
      )}

      {/* Category tags */}
      <div className="shop-category-row">
        {shop.categories.map((cat) => (
          <span key={cat} className="shop-category-tag">{cat}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */

function ShopOwnerView() {
  const [shops,    setShops]    = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();
  const [ownerContext, setOwnerContext] = useState(null);

 useEffect(() => {
  api.getShops()
    .then(async (shopList) => {
      setShops(shopList);
      const entries = await Promise.all(
        shopList.map((s) =>
          api.getShopStatus(s.shop_id).then((st) => [s.shop_id, st])
        )
      );
      setStatuses(Object.fromEntries(entries));
      const owner = await api.getOwnerContext('OWN-001');
      setOwnerContext(owner);
    })
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
}, []);

  return (
    <div className="merit-page">

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="plum-surface merit-nav">
        <div className="merit-logo" onClick={() => navigate('/')}>
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

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="hero-bg page-header">
        {/* Ambient glow blobs */}
        <div style={{
          position: 'absolute', top: '-60px', left: '-60px',
          width: '360px', height: '360px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,51,151,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,147,26,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div className="page-header-inner">
          {/* Label pill */}
          <div className="page-label">
            <span className="page-label-dot" />
            Shop Owner View
          </div>

          {/* Heading + button */}
          <div className="page-header-row">
            <div>
              <h1 style={{
                fontSize: 'clamp(26px, 4vw, 38px)',
                fontWeight: '800',
                letterSpacing: '-1.2px',
                color: 'var(--color-plum-ink)',
                margin: '0 0 10px',
                lineHeight: '1.1',
              }}>
                Your Kirana Club{' '}
                <span className="text-gradient-pink-gold">Shops</span>
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--color-plum-mid)', margin: 0, lineHeight: '1.6' }}>
                Select a shop to run Merit's trust analysis and see credit offers
              </p>
            </div>

            <button
              className="history-btn"
              onClick={() => navigate('/shop-owner/history')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View all loan history
            </button>
          </div>

          {/* Stat chips — shown once data is ready */}
         {!loading && !error && shops.length > 0 && (
  <div className="stat-chip-row">
    {[
      { label: 'Total shops',   value: shops.length },
      { label: 'New shops',     value: shops.filter((s) => s.months_active === 0).length },
      { label: 'Active loans',  value: Object.values(statuses).filter((s) => s?.eligibility === 'ACTIVE').length },
      ...(ownerContext ? [
        { label: 'Blended trust score', value: `${ownerContext.blended_score}/100` },
        {
          label: ownerContext.exposure_remaining === 0 ? 'At credit limit' : 'Credit headroom',
          value: `₹${ownerContext.exposure_remaining.toLocaleString('en-IN')}`,
          warn: ownerContext.exposure_remaining === 0,
        },
      ] : []),
    ].map(({ label, value, warn }) => (
      <div key={label} className="stat-chip">
        <span className="stat-chip-value" style={warn ? { color: 'var(--color-meesho-pink)' } : undefined}>
          {value}
        </span>
        <span className="stat-chip-label">{label}</span>
      </div>
    ))}
  </div>
)}
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="page-content"  style={{ position: 'relative' }}>

        {/* Loading */}
        {loading && (
          <div className="shop-grid">
            {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="error-card">
            <div className="error-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#B23B3B" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="error-title">Couldn't load shops</p>
              <p className="error-message">
                {error}. Is the backend running on port 5000?
              </p>
            </div>
          </div>
        )}

        {/* Shop grid */}
        {!loading && !error && (
         <div className="shop-grid">
  {shops.map((shop) => (
    <ShopCard
      key={shop.shop_id}
      shop={shop}
      status={statuses[shop.shop_id]}
      onClick={() => navigate(`/shop-owner/${shop.shop_id}`)}
    />
  ))}

  <div
    className="shop-card"
    style={{
      cursor: 'default',
      borderLeft: '4px solid #E85A2A',
      background: 'linear-gradient(180deg, #FFF9F5 0%, #FFFFFF 100%)',
    }}
  >
    <div className="shop-card-header">
      <div className="shop-card-identity">
        <div
          className="shop-initial-chip"
          style={{
            background: '#FFE9DF',
            color: '#E85A2A',
          }}
        >
          💡
        </div>

        <div className="shop-card-meta">
          <h3 className="shop-card-name" style={{ color: '#E85A2A' }}>
            Prototype Context
          </h3>

          <p className="shop-card-location">
            MVP implementation details
          </p>
        </div>
      </div>
    </div>
<div
  style={{
    marginTop: '16px',
    fontSize: '14px',
    color: 'var(--color-plum-mid)',
    lineHeight: '1.7',
  }}
>
  Representative merchant records are used for this MVP. In production, Merit would analyze live merchant data from <strong>Kirana Club</strong> using the same AI workflow.
</div>
  </div>
</div>
          
          
        )}
        
      </div>
    </div>
    
  );
}

export default ShopOwnerView;