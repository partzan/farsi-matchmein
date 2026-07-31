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
            <p className="mb-4 text-sm font-bold tracking-wide text-primary/80 sm:text-base">
              <span className="text-foreground">{fa.brand}</span>
              <span className="mx-2 text-border">|</span>
              <span className="font-semibold text-muted">{fa.brandEn}</span>
            </p>

            <p className="mb-5 text-xs font-semibold text-muted sm:text-sm">{fa.home.badge}</p>

            <h1 className="text-3xl font-black leading-[1.35] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {fa.home.heroTitle}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              {fa.home.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/profile-setup"
                className="inline-flex min-w-[12rem] items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white transition hover:bg-primary-dark"
              >
                {fa.home.ctaSecondary}
              </Link>
              <Link
                to="/events"
                className="inline-flex min-w-[12rem] items-center justify-center rounded-xl border border-border bg-white px-8 py-3.5 text-base font-bold text-foreground transition hover:border-primary hover:text-primary"
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
