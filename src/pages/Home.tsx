import { Link } from 'react-router-dom';
import { HeroBackground } from '../components/HeroBackground';
import { HeroEventFan } from '../components/HeroEventFan';
import { HowItWorksPath } from '../components/HowItWorksPath';
import { InterestMarquee } from '../components/InterestMarquee';
import { PlatformInfoTiles } from '../components/PlatformInfoTiles';
import { RealConnectionsSection } from '../components/RealConnectionsSection';
import { fa } from '../locale/fa';

export function Home() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden bg-background pb-6 pt-10 sm:pb-8 sm:pt-14 lg:pt-16">
        <HeroBackground />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.04em] text-muted sm:text-sm">
              <span className="text-foreground">{fa.brand}</span>
              <span className="mx-2 text-border">·</span>
              <span>{fa.brandEn}</span>
            </p>

            <p className="mb-6 text-xs font-medium text-primary/70 sm:text-sm">{fa.home.badge}</p>

            <h1 className="text-[1.7rem] font-bold leading-[1.45] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.4]">
              {fa.home.heroTitle}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:whitespace-nowrap sm:text-base md:text-lg">
              {fa.home.heroSubtitle}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/profile-setup"
                className="inline-flex min-w-[11.5rem] items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark sm:text-base"
              >
                {fa.home.ctaSecondary}
              </Link>
              <Link
                to="/events"
                className="inline-flex min-w-[11.5rem] items-center justify-center rounded-xl border border-border/90 bg-white/80 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:border-primary/40 hover:text-primary sm:text-base"
              >
                {fa.home.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Outside overflow-hidden so mobile sticky fullscreen panels work */}
      <div className="bg-background md:mx-auto md:max-w-6xl md:px-4 md:pb-16 lg:px-8">
        <HeroEventFan />
      </div>

      <InterestMarquee />
      <HowItWorksPath />
      <PlatformInfoTiles />
      <RealConnectionsSection />
    </div>
  );
}
