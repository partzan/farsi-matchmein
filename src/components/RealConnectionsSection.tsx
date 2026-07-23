import { useEffect, useRef, useState } from 'react';
import { fa } from '../locale/fa';

export function RealConnectionsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalTravel = viewportHeight + rect.height;
      const traveled = viewportHeight - rect.top;
      setScrollProgress(Math.min(1, Math.max(0, traveled / totalTravel)));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const orangeWeight = 1 - scrollProgress;
  const purpleWeight = scrollProgress;

  return (
    <section
      ref={sectionRef}
      className="relative py-14 sm:py-20 overflow-hidden transition-colors duration-300"
      style={{
        background: `linear-gradient(135deg,
          color-mix(in srgb, #FF6B2C ${orangeWeight * 100}%, #C026D3 ${purpleWeight * 100}%),
          color-mix(in srgb, #FF3D71 ${orangeWeight * 100}%, #200443 ${purpleWeight * 100}%)
        )`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.12)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block text-white/80 font-extrabold tracking-widest text-xs mb-6 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
          {fa.realConnections.badge}
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          {fa.realConnections.title}
        </h2>
        <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto font-medium">
          {fa.realConnections.description}
        </p>
      </div>
    </section>
  );
}
