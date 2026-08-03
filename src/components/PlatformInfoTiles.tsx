import { useState } from 'react';
import { FlipCard } from './FlipCard';
import { VOTING_ENABLED } from '../lib/features';
import { fa } from '../locale/fa';

/** Local optimized assets (WebP + JPEG fallback) for platform flip cards */
const CARD_PHOTOS: Record<string, { webp: string; jpg: string; alt: string }> = {
  voteDemand: { webp: '/platform/vote.webp', jpg: '/platform/vote.jpg', alt: '' },
  privacyPay: { webp: '/platform/privacy.webp', jpg: '/platform/privacy.jpg', alt: '' },
  notifyMatch: { webp: '/platform/notify.webp', jpg: '/platform/notify.jpg', alt: '' },
  rewardsAi: { webp: '/platform/rewards.webp', jpg: '/platform/rewards.jpg', alt: '' },
};

const BACK_COLORS = [
  { bg: '#F3E8FF', accent: '#C026D3', soft: '#6D28D9' },
  { bg: '#FFF1E8', accent: '#FF6B2C', soft: '#FF3D71' },
  { bg: '#E8F8F5', accent: '#0D9488', soft: '#00D4E8' },
  { bg: '#FDF2F8', accent: '#DB2777', soft: '#C026D3' },
];

/** Decorative abstract vector shapes — different layout per card */
function VectorBackdrop({ variant }: { variant: number }) {
  const c = BACK_COLORS[variant % BACK_COLORS.length];
  if (variant % 4 === 0) {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="40" cy="40" r="70" fill={c.accent} opacity="0.18" />
        <circle cx="250" cy="280" r="90" fill={c.soft} opacity="0.2" />
        <path d="M180 20 Q260 80 200 160 Q140 220 80 140 Q40 60 120 20 Z" fill={c.accent} opacity="0.22" />
        <rect x="20" y="200" width="70" height="70" rx="18" fill={c.soft} opacity="0.15" transform="rotate(-12 55 235)" />
      </svg>
    );
  }
  if (variant % 4 === 1) {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <ellipse cx="220" cy="50" rx="80" ry="55" fill={c.accent} opacity="0.2" />
        <path d="M-10 160 Q70 100 140 170 T280 150 L280 320 L0 320 Z" fill={c.soft} opacity="0.16" />
        <circle cx="60" cy="60" r="36" fill={c.accent} opacity="0.25" />
        <polygon points="200,180 260,210 230,270 170,250" fill={c.soft} opacity="0.2" />
      </svg>
    );
  }
  if (variant % 4 === 2) {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="140" cy="280" r="100" fill={c.accent} opacity="0.15" />
        <path d="M40 40 C90 10, 160 30, 180 90 C200 150, 120 180, 70 140 C20 100, 0 70, 40 40 Z" fill={c.soft} opacity="0.22" />
        <rect x="190" y="40" width="60" height="60" rx="30" fill={c.accent} opacity="0.2" />
        <circle cx="50" cy="220" r="28" fill={c.soft} opacity="0.25" />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d="M0 80 Q70 20 140 80 T280 60 L280 0 L0 0 Z" fill={c.accent} opacity="0.18" />
      <circle cx="230" cy="200" r="65" fill={c.soft} opacity="0.2" />
      <path d="M20 260 Q80 200 120 260 T220 280" fill="none" stroke={c.accent} strokeWidth="18" opacity="0.15" strokeLinecap="round" />
      <rect x="30" y="120" width="50" height="50" rx="12" fill={c.soft} opacity="0.18" transform="rotate(20 55 145)" />
    </svg>
  );
}

export function PlatformInfoTiles() {
  const [flippedKey, setFlippedKey] = useState<string | null>(null);
  const cards = fa.platform.cards.filter(
    (c) => VOTING_ENABLED || c.key !== 'voteDemand',
  );

  return (
    <section className="relative -mt-2 overflow-hidden py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-primary-light/20 to-background" />
      <div className="pointer-events-none absolute top-10 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-accent-orange/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
            {fa.platform.title}
          </h2>
          <p className="px-1 text-base leading-relaxed text-gray-600 sm:text-lg">
            {fa.platform.subtitle}
          </p>
        </div>

        <div className={`grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 ${cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} lg:gap-7`}>
          {cards.map((item, i) => {
            const isFlipped = flippedKey === item.key;
            const back = BACK_COLORS[i % BACK_COLORS.length];
            const photo = CARD_PHOTOS[item.key] ?? CARD_PHOTOS.privacyPay;

            return (
              <FlipCard
                key={item.key}
                flipped={isFlipped}
                width="100%"
                height={340}
                className="w-full max-w-[280px]"
                onMouseOver={() => setFlippedKey(item.key)}
                onMouseOut={() => setFlippedKey(null)}
                onClick={() => setFlippedKey(isFlipped ? null : item.key)}
                style={{ wrapper: { maxWidth: 280 } }}
                frontChild={
                  <div className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-3xl border border-white/20 shadow-xl shadow-primary/15">
                    <picture>
                      <source srcSet={photo.webp} type="image/webp" />
                      <img
                        src={photo.jpg}
                        alt={photo.alt}
                        width={720}
                        height={900}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </picture>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
                    <div className="relative z-10 flex flex-col gap-2 p-5 text-white">
                      <span className="text-xs font-extrabold text-white/70">
                        {String(i + 1).padStart(2, '0')} · {item.title}
                      </span>
                      <h3 className="text-xl font-extrabold leading-snug">{item.tagline}</h3>
                      <p className="text-sm leading-relaxed text-white/90 line-clamp-4">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/60">{fa.platform.flipHint}</p>
                    </div>
                  </div>
                }
                backChild={
                  <div
                    className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border/60 p-5 shadow-xl"
                    style={{ backgroundColor: back.bg }}
                  >
                    <VectorBackdrop variant={i} />
                    <div className="relative z-10 flex flex-1 flex-col text-start">
                      <span className="text-xs font-extrabold" style={{ color: back.accent }}>
                        {String(i + 1).padStart(2, '0')} · {item.title}
                      </span>
                      <h3 className="mt-3 text-xl font-extrabold leading-snug text-foreground">
                        {item.tagline}
                      </h3>
                      <p className="mt-auto pt-4 text-sm font-medium text-muted">
                        {fa.platform.comingSoon}
                      </p>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
