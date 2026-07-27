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

export function HeroEventFan() {
  return (
    <div className="mt-12">
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
