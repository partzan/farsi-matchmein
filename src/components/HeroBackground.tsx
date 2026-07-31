export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-background" aria-hidden>
      <div
        className="absolute inset-x-0 top-0 h-[70%] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(32, 4, 67, 0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-50"
        style={{
          background:
            'linear-gradient(to top, rgba(255, 247, 242, 1) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
