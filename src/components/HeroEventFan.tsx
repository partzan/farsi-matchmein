import { useEffect, useRef, useState } from 'react';
import { fa } from '../locale/fa';

const PHOTOS = [
  '/hero/badminton.png',
  '/hero/burger.png',
  '/hero/bookclub.png',
  '/hero/boardgame.png',
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
      <p className="mb-2 px-4 text-center text-sm font-bold text-foreground">
        {fa.home.heroEventsLabel}
      </p>
      <p className="mb-6 px-4 text-center text-xs font-medium text-muted">
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
                className={`h-full w-full object-cover transition-opacity duration-500 ${
                  active === i ? 'opacity-100' : 'opacity-80'
                }`}
              />

              <figcaption
                className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-primary-dark via-primary-dark/75 to-transparent px-5 pb-6 pt-16 transition-opacity duration-400 ${
                  active === i ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <span className="mb-2 inline-block text-[11px] font-bold uppercase tracking-wide text-white/70">
                  {fa.home.heldBadge}
                </span>
                <h3 className="text-xl font-black text-white sm:text-2xl">{ev.caption}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">{ev.blurb}</p>

                <div className="mt-4 flex items-center gap-1.5" aria-hidden>
                  {fa.home.heroEvents.map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        dot === active ? 'w-5 bg-white' : 'w-1.5 bg-white/35'
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

function DesktopEventStrip() {
  return (
    <div className="mt-10 hidden md:block">
      <p className="mb-4 text-center text-sm font-bold text-foreground sm:text-base">
        {fa.home.heroEventsLabel}
      </p>

      <div className="grid grid-cols-4 gap-2 overflow-hidden rounded-2xl sm:gap-3">
        {fa.home.heroEvents.map((ev, i) => (
          <figure key={ev.caption} className="group relative overflow-hidden">
            <img
              src={PHOTOS[i]}
              alt={ev.caption}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-dark/90 to-transparent px-3 pb-3 pt-10">
              <span className="block text-[10px] font-bold text-white/65">{fa.home.heldBadge}</span>
              <span className="mt-0.5 block text-sm font-bold text-white">{ev.caption}</span>
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
      <DesktopEventStrip />
    </>
  );
}
