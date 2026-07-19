// Shared status config and badge component for all loan-related pages.
// Import STATUS_MAP when you need dot colors or dotBg for row indicators.

export const STATUS_MAP = {
  pending:    { badgeCls: 'shop-badge shop-badge--pending',   label: 'Pending Review', dot: 'var(--color-gold)',  dotBg: 'var(--color-gold-bg)' },
  active:     { badgeCls: 'shop-badge shop-badge--active',    label: 'Active',         dot: 'var(--color-plum)', dotBg: 'rgba(61,42,74,0.10)' },
  overdue:    { badgeCls: 'shop-badge shop-badge--overdue',   label: 'Overdue',        dot: 'var(--color-gold)', dotBg: 'var(--color-gold-bg)' },
  defaulted:  { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Defaulted',      dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
  loss_asset: { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Written Off',    dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
  completed:  { badgeCls: 'trust-badge trust-badge--strong',  label: 'Completed',      dot: '#1F6E5C',           dotBg: '#DCEFE8' },
  rejected:   { badgeCls: 'shop-badge shop-badge--defaulted', label: 'Rejected',       dot: '#B23B3B',           dotBg: 'rgba(178,59,59,0.09)' },
};

export function LoanStatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span className={cfg.badgeCls}>{cfg.label}</span>;
}