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
            <span className="inline-flex items-center gap-2 text-sm font-bold text-primary bg-primary-light px-4 py-2 rounded-full mb-8 border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-orange" />
              </span>
              {fa.home.badge}
            </span>
            <TypewriterHeadline />
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              {fa.home.subtitle}
            </p>
            <Link 
              to="/events" 
              className="inline-block bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-full font-bold text-xl transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
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
