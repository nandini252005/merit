function Button({ children, variant = 'primary', size = 'md', onClick, disabled = false, type = 'button', className = '' }) {
  const base = 'font-semibold rounded-[12px] transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary: 'text-white hover:brightness-110 active:brightness-95 hover:-translate-y-[1px] active:translate-y-0',
    secondary: 'bg-white border hover:bg-[var(--color-warm-gray)] hover:-translate-y-[1px] active:translate-y-0',
    ghost: 'bg-transparent hover:bg-[var(--color-warm-gray)]',
    danger: 'text-white hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0',
  };

  const variantStyles = {
    primary: { backgroundColor: 'var(--color-plum)' },
    secondary: { color: 'var(--color-plum)', borderColor: 'var(--color-border)' },
    ghost: { color: 'var(--color-plum)' },
    danger: { backgroundColor: 'var(--color-danger)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}

export default Button;