import { useState } from 'react';
import { api } from '../api/client';

function ResetDemoModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetDemo = async () => {
    try {
      setLoading(true);

      await api.resetDemoDatabase();

      setLoading(false);
      setOpen(false);

      window.location.reload();
    } catch (err) {
      setLoading(false);
      alert(err.message);
    }
  };

  return (
    <>
      {/* Navbar Button */}
      <button
        onClick={() => setOpen(true)}
        title="Restore the demo database so the complete workflow can be tested again."
        style={{
          marginLeft: '20px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
          padding: '10px 18px',
          borderRadius: '14px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: '0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.16)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }}
      >
        ↺ Reset Demo
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(27,17,36,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '500px',
              background: 'white',
              borderRadius: '24px',
              padding: '34px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              animation: 'fadeIn .2s ease',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                fontSize: '30px',
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                textAlign: 'center',
                color: 'var(--color-plum)',
                margin: 0,
                fontWeight: 800,
              }}
            >
              Restore Demo State
            </h2>

            <p
              style={{
                textAlign: 'center',
                marginTop: '12px',
                color: 'var(--color-plum-soft)',
                lineHeight: '1.7',
                fontSize: '15px',
              }}
            >
              Restore the application to its original demonstration state so the
              complete workflow can be tested again.
            </p>

            <div
              style={{
                marginTop: '28px',
                background: 'rgba(61,42,74,0.05)',
                borderRadius: '16px',
                padding: '18px',
              }}
            >
              <p
                style={{
                  margin: '0 0 14px',
                  fontWeight: 700,
                  color: 'var(--color-plum)',
                }}
              >
                The following will be cleared
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  color: 'var(--color-plum-soft)',
                  fontSize: '14px',
                }}
              >
                <div>✓ Loan applications</div>
                <div>✓ Active & completed loans</div>
                <div>✓ Repayment history</div>
                <div>✓ Trust score history</div>
                <div>✓ Previous analyses</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '30px',
              }}
            >
              <button
                disabled={loading}
                onClick={() => setOpen(false)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid #DDD',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                disabled={loading}
                onClick={resetDemo}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--color-meesho-pink)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Resetting...' : 'Reset Demo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResetDemoModal;