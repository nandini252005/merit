function Badge({ children, variant = 'neutral' }) {
  const variants = {
    success: { backgroundColor: '#E7F3EF', color: 'var(--color-success)' },
    warning: { backgroundColor: '#FBF1E1', color: 'var(--color-warning)' },
    danger: { backgroundColor: '#F8E9E9', color: 'var(--color-danger)' },
    neutral: { backgroundColor: 'var(--color-warm-gray)', color: 'var(--color-ink)' },
    plum: { backgroundColor: '#EFE9F1', color: 'var(--color-plum)' },
  };

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={variants[variant]}
    >
      {children}
    </span>
  );
}

export default Badge;