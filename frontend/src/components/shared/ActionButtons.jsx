// Approve and reject button pair for loan decisions.
// Uses .btn-approve and .btn-reject from index.css.

export function ActionButtons({ loan, actingOn, onDecision }) {
  const busy = actingOn === loan.id;
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        className="btn-reject"
        disabled={busy}
        onClick={() => onDecision(loan.id, 'reject')}
      >
        Reject
      </button>
      <button
        className="btn-approve"
        disabled={busy}
        onClick={() => onDecision(loan.id, 'approve')}
      >
        {busy ? 'Working...' : '\u2713 Approve'}
      </button>
    </div>
  );
}