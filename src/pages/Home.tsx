import { Link } from 'react-router-dom';
import { HeroBackground } from '../components/HeroBackground';
import { PlatformInfoTiles } from '../components/PlatformInfoTiles';
import { RealConnectionsSection } from '../components/RealConnectionsSection';
import { TypewriterHeadline } from '../components/TypewriterHeadline';
import { fa } from '../locale/fa';

export function Home() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden bg-background py-12 sm:py-14 lg:py-16">
        <HeroBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-primary bg-primary-light px-4 py-2 rounded-full mb-8 border border-accent-purple/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
              </span>
              {fa.home.badge}
            </span>
            <TypewriterHeadline />
            <Link 
              to="/events" 
              className="inline-block bg-gradient-to-l from-primary via-primary-mid to-accent-purple hover:from-primary-dark hover:via-primary hover:to-accent-purple text-white px-10 py-5 rounded-full font-bold text-xl transition-all shadow-lg shadow-accent-purple/30 hover:shadow-xl hover:shadow-accent-orange/25 hover:-translate-y-1"
            >
              {fa.home.cta}
            </Link>
          </div>
        </div>
      </section>

      <PlatformInfoTiles />
      <RealConnectionsSection />
    </div>
  );
}
