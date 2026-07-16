import { useNavigate } from 'react-router-dom';
import ResetDemoModal from '../ResetDemoModal';

function TopNav({ onLogoClick }) {
  const navigate = useNavigate();
  const handleLogoClick = onLogoClick ?? (() => navigate('/'));

  return (
    <nav className="plum-surface merit-nav">
      {/* ── Logo ── */}
     <div
  className="merit-logo"
  onClick={handleLogoClick}
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  }}
>
  <div
  className="merit-logo-chip"
  style={{
    width: "40px",
    height: "43px",
    borderRadius: "10px",
    background: "linear-gradient(145deg, #F6ECFF 0%, #EAD7FF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 4px 10px rgba(90,40,120,0.12), inset 0 1px 1px rgba(255,255,255,.9)",
    overflow: "hidden",
  }}
>
  <svg width="24" height="24" viewBox="0 0 24 24">
    <defs>
      {/* Gradient for the M */}
      <linearGradient id="mGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7B2CBF" />
        <stop offset="50%" stopColor="#5A189A" />
        <stop offset="100%" stopColor="#3C096C" />
      </linearGradient>

      {/* Shine */}
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
        <stop offset="35%" stopColor="rgba(255,255,255,0.45)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>

      <clipPath id="clipM">
        <path d="M4 19V5h3.2L12 13l4.8-8H20v14h-3V10.2L12 18l-5-7.8V19H4z" />
      </clipPath>
    </defs>

    {/* Main M */}
    <path
      d="M4 19V5h3.2L12 13l4.8-8H20v14h-3V10.2L12 18l-5-7.8V19H4z"
      fill="url(#mGrad)"
    />

    {/* Glossy shine clipped inside the M */}
    <g clipPath="url(#clipM)">
      <rect
        x="-5"
        y="-5"
        width="14"
        height="40"
        fill="url(#shine)"
        transform="rotate(25)"
      />
    </g>
  </svg>
</div>

  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      lineHeight: 1,
    }}
  >
    <span
      style={{
        fontSize: "1.35rem",
        fontWeight: 800,
        fontFamily: "Inter, sans-serif",
        letterSpacing: "0.08em",
        color: "#fff",
        textTransform: "uppercase",
      }}
    >
      MERIT
    </span>

    <span
      style={{
        marginTop: "4px",
        fontSize: "0.59rem",
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.3,
        maxWidth: "230px",
        letterSpacing: "0.02em",
      }}
    >
      Merchant Evaluation &amp; Retail Intelligence for Trust
    </span>
  </div>
</div>

     <ResetDemoModal />
    </nav>
  );
}

export default TopNav;