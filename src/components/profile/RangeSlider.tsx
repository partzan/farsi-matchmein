import { useCallback, useId, useRef, type PointerEvent as ReactPointerEvent } from 'react';

type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  minLabel?: string;
  maxLabel?: string;
  formatValue?: (n: number) => string;
  'aria-label'?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Dual-handle range bar — LTR track so left=min, right=max (labels stay Persian). */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  minLabel,
  maxLabel,
  formatValue = (n) => String(n),
  'aria-label': ariaLabel,
}: RangeSliderProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [lo, hi] = value;
  const span = max - min || 1;

  const pct = (n: number) => ((n - min) / span) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return min;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = min + ratio * span;
      return Math.round(raw / step) * step;
    },
    [min, span, step],
  );

  const startDrag = (which: 'lo' | 'hi') => (e: ReactPointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const next = valueFromClientX(ev.clientX);
      if (which === 'lo') {
        onChange([clamp(next, min, hi), hi]);
      } else {
        onChange([lo, clamp(next, lo, max)]);
      }
    };
    const up = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onTrackPointerDown = (e: ReactPointerEvent) => {
    if (e.target !== trackRef.current && !(e.target as HTMLElement).dataset.track) return;
    const next = valueFromClientX(e.clientX);
    const distLo = Math.abs(next - lo);
    const distHi = Math.abs(next - hi);
    if (distLo <= distHi) onChange([clamp(next, min, hi), hi]);
    else onChange([lo, clamp(next, lo, max)]);
  };

  return (
    <div className="w-full" dir="ltr" aria-label={ariaLabel}>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold text-foreground">
        <span className="rounded-lg bg-primary-light px-2.5 py-1 text-primary tabular-nums">
          {formatValue(lo)}
        </span>
        <span className="text-muted">—</span>
        <span className="rounded-lg bg-primary-light px-2.5 py-1 text-primary tabular-nums">
          {formatValue(hi)}
        </span>
      </div>

      <div
        ref={trackRef}
        data-track="1"
        onPointerDown={onTrackPointerDown}
        className="relative mx-1 h-3 cursor-pointer rounded-full bg-border touch-none"
        role="group"
        aria-labelledby={`${id}-min ${id}-max`}
      >
        <div
          data-track="1"
          className="pointer-events-none absolute inset-y-0 rounded-full bg-gradient-to-r from-primary to-accent-purple"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />

        <button
          type="button"
          id={`${id}-min`}
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={lo}
          aria-label={minLabel || 'حد پایین'}
          onPointerDown={startDrag('lo')}
          className="absolute top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg shadow-primary/30 outline-none ring-primary focus-visible:ring-4"
          style={{ left: `${pct(lo)}%` }}
        />
        <button
          type="button"
          id={`${id}-max`}
          aria-valuemin={lo}
          aria-valuemax={max}
          aria-valuenow={hi}
          aria-label={maxLabel || 'حد بالا'}
          onPointerDown={startDrag('hi')}
          className="absolute top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-purple shadow-lg shadow-accent-purple/30 outline-none ring-accent-purple focus-visible:ring-4"
          style={{ left: `${pct(hi)}%` }}
        />
      </div>

      {(minLabel || maxLabel) && (
        <div className="mt-2 flex justify-between gap-2 text-xs font-semibold text-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
