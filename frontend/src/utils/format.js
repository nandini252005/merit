// Formats a number as an Indian rupee string.
export function fmtCurrency(amount) {
  if (amount == null) return '\u2014';
  return `\u20b9${Number(amount).toLocaleString('en-IN')}`;
}

// Formats an ISO date string as "15 Jul 2026".
export function fmtDate(isoString) {
  if (!isoString) return '\u2014';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}