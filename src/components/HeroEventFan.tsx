import { useEffect, useRef, useState } from 'react';
import { fa } from '../locale/fa';

const PHOTOS = [
  '/hero/badminton.png',
  '/hero/burger.png',
  '/hero/bookclub.png',
  '/hero/boardgame.png',
];

/* Tilt + vertical offset per card; hover straightens and lifts */
const CARD_POSES = [
  '-rotate-6 translate-y-3',
  'rotate-2 -translate-y-1',
  '-rotate-2 translate-y-2',
  'rotate-6 -translate-y-2',
];

function MobileEventScroll() {
  const [active, setActive] = useState(0);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    if (panels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = panels.indexOf(visible.target as HTMLElement);
        if (idx >= 0) setActive(idx);
      },
      { threshold: [0.35, 0.55, 0.75] },
    );

    panels.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="md:hidden">
      <p className="mb-4 px-4 text-center text-sm font-black text-muted">
        {fa.home.heroEventsLabel}
      </p>
      <p className="mb-6 flex items-center justify-center gap-2 px-4 text-xs font-bold text-primary/70">
        <span className="inline-block animate-bounce text-base" aria-hidden>
          ↓
        </span>
        {fa.home.heroEventsScrollHint}
      </p>

      <div className="relative">
        {fa.home.heroEvents.map((ev, i) => (
          <article
            key={ev.caption}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-primary-dark"
            style={{ zIndex: i + 1 }}
            aria-current={active === i ? 'true' : undefined}
          >
            <figure className="relative aspect-[4/3] w-[min(100%,calc(100dvh*4/3))] max-h-dvh shrink-0">
              <img
                src={PHOTOS[i]}
                alt={ev.caption}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`h-full w-full object-contain transition-transform duration-700 ease-out ${
                  active === i ? 'scale-100' : 'scale-105'
                }`}
              />

              <figcaption
                className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-primary-dark/95 via-primary-dark/70 to-transparent px-5 pb-5 pt-14 transition-all duration-500 ${
                  active === i ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-50'
                }`}
              >
                <span className="mb-2 inline-flex rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">
                  {fa.home.heldBadge}
                </span>
                <h3 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
                  <span className="text-2xl sm:text-3xl" aria-hidden>
                    {ev.emoji}
                  </span>
                  {ev.caption}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">{ev.blurb}</p>

                <div className="mt-4 flex items-center gap-2" aria-hidden>
                  {fa.home.heroEvents.map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        dot === active ? 'w-6 bg-accent-cyan' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </figcaption>
            </figure>
          </article>
        ))}
      </div>
    </div>
  );
}

function DesktopEventFan() {
  return (
    <div className="mt-12 hidden md:block">
      <p className="mb-5 text-sm font-black text-muted sm:text-base">
        {fa.home.heroEventsLabel}
      </p>

      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:flex-nowrap sm:gap-0">
        {fa.home.heroEvents.map((ev, i) => (
          <figure
            key={ev.caption}
            className={`group relative w-[42%] min-w-[9.5rem] cursor-default rounded-2xl bg-white p-2 pb-3 shadow-xl shadow-primary/15 ring-1 ring-border/60 transition-all duration-300 hover:z-20 hover:-translate-y-2 hover:rotate-0 hover:scale-105 hover:shadow-2xl sm:w-56 sm:-ms-4 sm:first:ms-0 ${CARD_POSES[i]}`}
          >
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={PHOTOS[i]}
                alt={ev.caption}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute top-2 start-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                {fa.home.heldBadge}
              </span>
            </div>
            <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-xs font-black text-foreground sm:text-sm">
              <span className="text-base">{ev.emoji}</span>
              {ev.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function HeroEventFan() {
  return (
    <>
      <MobileEventScroll />
      <DesktopEventFan />
    </>
  );
}
