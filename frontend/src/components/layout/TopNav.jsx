function TopNav() {
  return (
    <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: 'var(--color-plum)', color: 'white' }}
        >
          M
        </div>
        <span className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Merit</span>
      </div>
      <div className="flex items-center gap-8">
        <span className="text-sm font-medium" style={{ color: 'var(--color-plum-soft)' }}>
          Scripted by Her 2.0 · Meesho
        </span>
      </div>
    </nav>
  );
}

export default TopNav;