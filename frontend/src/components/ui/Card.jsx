function Card({ children, className = '', onClick, hoverable = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[12px] border p-6 ${hoverable ? 'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]' : ''} ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </div>
  );
}

export default Card;