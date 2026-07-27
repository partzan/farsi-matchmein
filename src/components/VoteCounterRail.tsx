import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type VoteCounterRailProps = {
  remaining: number | null;
  max?: number;
  /** When true, render sticky left rail (desktop) + compact top bar (mobile) */
  sticky?: boolean;
  to?: string;
};

export function VoteCounterRail({
  remaining,
  max = 4,
  sticky = true,
  to = '/events',
}: VoteCounterRailProps) {
  const value = remaining ?? '—';
  const label = `${value}/${max}`;

  const chip = (
    <Link
      to={to}
      className="inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-primary bg-primary px-3.5 py-2.5 text-center shadow-md shadow-primary/25 transition hover:-translate-y-0.5 hover:border-accent-cyan hover:shadow-accent-cyan/20"
      title={fa.voteCounter.tooltip}
      aria-label={`${fa.voteCounter.label} ${label}`}
    >
      <span className="text-base leading-none" aria-hidden>
        🎟
      </span>
      <span className="text-sm font-black text-white tabular-nums">{label}</span>
      <span className="text-[10px] font-semibold text-accent-cyan">{fa.voteCounter.weekly}</span>
    </Link>
  );

  if (!sticky) return chip;

  return (
    <>
      <div className="sticky top-[5rem] z-40 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-sm font-bold text-muted">{fa.voteCounter.label}</span>
          {chip}
        </div>
      </div>

      <aside
        className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
        aria-label={fa.voteCounter.label}
      >
        <div className="pointer-events-auto">{chip}</div>
      </aside>
    </>
  );
}
