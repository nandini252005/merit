// Displayed when a loan status is loss_asset (written off).
// Clearly communicates write-off is not debt forgiveness.

export function WriteOffNotice({ compact = false }) {
  return (
    <div className={`writeoff-notice${compact ? ' writeoff-notice--compact' : ''}`}>
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#B23B3B" strokeWidth="2"
        style={{ flexShrink: 0, marginTop: '2px' }}
      >
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: '12px', color: 'var(--color-plum-mid)', margin: 0, lineHeight: '1.6' }}>
        <strong style={{ color: '#B23B3B' }}>Written off - not forgiven.</strong>{' '}
        Handed to collections in production, reported to credit record, and recoverable at any time.
      </p>
    </div>
  );
}