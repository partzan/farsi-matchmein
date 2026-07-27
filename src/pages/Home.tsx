import { Link } from 'react-router-dom';
import { HeroBackground } from '../components/HeroBackground';
import { HeroEventFan } from '../components/HeroEventFan';
import { HowItWorksPath } from '../components/HowItWorksPath';
import { InterestMarquee } from '../components/InterestMarquee';
import { PlatformInfoTiles } from '../components/PlatformInfoTiles';
import { RealConnectionsSection } from '../components/RealConnectionsSection';
import { TypewriterHeadline } from '../components/TypewriterHeadline';
import { fa } from '../locale/fa';

const FLOATERS = [
  { emoji: '⚽', className: 'top-[14%] right-[8%] text-4xl animate-float-slow' },
  { emoji: '🎬', className: 'top-[24%] left-[10%] text-3xl animate-float-slower' },
  { emoji: '🎲', className: 'bottom-[20%] right-[14%] text-3xl animate-float-slower' },
  { emoji: '🎨', className: 'bottom-[26%] left-[16%] text-4xl animate-float-slow' },
  { emoji: '🏕️', className: 'top-[52%] right-[4%] text-2xl animate-float-slower hidden sm:block' },
  { emoji: '🎤', className: 'top-[48%] left-[4%] text-2xl animate-float-slow hidden sm:block' },
];

export function Home() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden bg-background py-12 pb-8 sm:py-14 lg:py-16">
        <HeroBackground />

        {/* Floating interest stickers */}
        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
          {FLOATERS.map((f) => (
            <span
              key={f.emoji}
              className={`absolute select-none opacity-70 drop-shadow-lg ${f.className}`}
            >
              {f.emoji}
            </span>
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent-purple/20 bg-primary-light px-4 py-2 text-sm font-bold text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-orange opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-cyan" />
              </span>
              {fa.home.badge}
            </span>
            <TypewriterHeadline />
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/profile-setup"
                className="inline-block rounded-full bg-gradient-to-l from-primary via-primary-mid to-accent-purple px-10 py-5 text-xl font-bold text-white shadow-lg shadow-accent-purple/30 transition-all hover:-translate-y-1 hover:from-primary-dark hover:via-primary hover:to-accent-purple hover:shadow-xl hover:shadow-accent-orange/25"
              >
                {fa.home.ctaSecondary} 🎯
              </Link>
              <Link
                to="/events"
                className="inline-block rounded-full border-2 border-primary/30 bg-white/60 px-8 py-4 text-lg font-bold text-primary backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
              >
                {fa.home.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Outside overflow-hidden so mobile sticky fullscreen panels work */}
      <div className="bg-background md:mx-auto md:max-w-4xl md:px-4 md:pb-16 md:text-center lg:px-8">
        <HeroEventFan />
      </div>

      <InterestMarquee />
      <HowItWorksPath />
      <PlatformInfoTiles />
      <RealConnectionsSection />
    </div>
  );
}
