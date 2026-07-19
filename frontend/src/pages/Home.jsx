import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import TopNav from '../components/layout/TopNav';

// Reusable card

function ViewCard({ title, subtitle, ctaText, ctaColor, accentGradient, iconBg, icon, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="merit-card"
      style={{
        flex: 1,
        minWidth: '260px',
        maxWidth: '380px',
        padding: '36px 32px 32px',
        textAlign: 'left',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        /* override merit-card hover with JS for the spring easing */
        boxShadow: hov
          ? '0 24px 60px rgba(61, 42, 74, 0.20)'
          : '0 6px 32px rgba(61, 42, 74, 0.11)',
        transform: hov ? 'translateY(-10px) scale(1.015)' : 'translateY(0) scale(1)',
        transition: 'all 0.34s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Coloured top stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: accentGradient,
          borderRadius: '22px 22px 0 0',
        }}
      />

      {/* Icon chip */}
      <div
        style={{
          width: '52px', height: '52px',
          backgroundColor: iconBg,
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '22px',
          transform: hov ? 'scale(1.1) rotate(-5deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: '20px', fontWeight: '700',
          color: 'var(--color-plum-ink)',
          margin: '0 0 10px',
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-plum-soft)',
          lineHeight: '1.78',
          margin: '0 0 30px',
        }}
      >
        {subtitle}
      </p>

      {/* CTA */}
      <span
        style={{
          fontSize: '12px', fontWeight: '800',
          color: ctaColor,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: '7px',
        }}
      >
        {ctaText}
        <svg
          width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.8"
          style={{
            transition: 'transform 0.22s ease',
            transform: hov ? 'translateX(6px)' : 'translateX(0)',
          }}
        >
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

// Main Page

function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* NAVBAR */}
      <TopNav />

      {/* HERO */}
      <section
        className="hero-bg"
        style={{
          padding: '92px 52px 112px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {/* Glow blobs */}
        <div className="hero-orb hero-orb--pink" />
        <div className="hero-orb hero-orb--gold" />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '35%',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180,140,220,0.16) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Heading */}
        <h1
          style={{
            fontSize: 'clamp(34px, 5.2vw, 56px)',
            fontWeight: '800',
            lineHeight: '1.1',
            letterSpacing: '-2px',
            color: 'var(--color-plum-ink)',
            maxWidth: '700px',
            margin: '0 auto 22px',
            position: 'relative', zIndex: 1,
          }}
        >
          You've been building trust. <br />
          <span className="text-gradient-pink-gold">
           Merit noticed.
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          style={{
            fontSize: '17px',
            color: 'var(--color-plum-mid)',
            maxWidth: '500px',
            margin: '0 auto 76px',
            lineHeight: '1.78',
            position: 'relative', zIndex: 1,
          }}
        >
          Every transaction tells a story. MERIT turns those everyday business signals into intelligent credit decisions that work for Bharat's retailers.
        </p>

        {/* Cards */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '840px',
            margin: '0 auto',
            position: 'relative', zIndex: 1,
          }}
        >
          <ViewCard
            title="View as a Retailer"
            subtitle="See your trust score build in real time, apply for credit, and watch repayments adjust to how your shop is actually selling."
            ctaText="Enter Portal"
            ctaColor="var(--color-meesho-pink)"
            accentGradient="linear-gradient(90deg, var(--color-meesho-pink) 0%, var(--color-pink-light) 100%)"
            iconBg="var(--color-pink-bg)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-meesho-pink)" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            onClick={() => navigate('/shop-owner')}
          />

          <ViewCard
            title="View as Credit Officer"
            subtitle="Assess merchant eligibility, approve financing, and monitor loan performance across the lending portfolio."
            ctaText="Open Dashboard"
            ctaColor="var(--color-gold-dark)"
            accentGradient="linear-gradient(90deg, var(--color-gold) 0%, var(--color-gold-light) 100%)"
            iconBg="var(--color-gold-bg)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-gold-dark)" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            }
            onClick={() => navigate('/dashboard')}
          />
        </div>

        {/* Stats strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '76px',
            flexWrap: 'wrap',
            position: 'relative', zIndex: 1,
          }}
        >
          <div style={{ padding: '0 52px', textAlign: 'center' }}>
            <p style={{
              fontSize: '32px', fontWeight: '800',
              color: 'var(--color-plum)',
              margin: '0 0 6px', letterSpacing: '-0.9px',
            }}>
              4.1M+
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-plum-soft)', margin: 0 }}>
              Registered Kirana retailers ready for AI-powered credit
            </p>
          </div>

          <div style={{
            width: '1px', height: '52px', flexShrink: 0,
            background: 'linear-gradient(to bottom, transparent, rgba(61,42,74,0.22), transparent)',
          }} />

          <div style={{ padding: '0 52px', textAlign: 'center' }}>
            <p style={{
              fontSize: '32px', fontWeight: '800',
              color: 'var(--color-gold-dark)',
              margin: '0 0 6px', letterSpacing: '-0.9px',
            }}>
              ₹100Cr
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-plum-soft)', margin: 0 }}>
              New capital fueling MPPL's next phase of lending growth
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="plum-surface"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 52px',
          textAlign: 'center',
        }}
      >
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.38)',
          margin: 0,
          letterSpacing: '0.25px',
        }}>
           Runs on simulated Kirana Club data · Powered by Agentic AI · Built for Bharat · Scripted By{"{"}Her{"}"} 2.0
        </p>
      </footer>
    </div>
  );
}

export default Home;