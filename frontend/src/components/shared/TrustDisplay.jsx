// Shared trust score display components for pipeline and admin views.

export function TrustBadge({ status }) {
  const cls = {
    Strong:   'trust-badge trust-badge--strong',
    Moderate: 'trust-badge trust-badge--moderate',
    Risky:    'trust-badge trust-badge--risky',
  };
  return <span className={cls[status] || cls.Moderate}>{status}</span>;
}

export function TrustBar({ score }) {
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