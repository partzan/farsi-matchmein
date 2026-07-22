import { useEffect, useState } from 'react';

export function HeroBackground() {
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Trigger the initial "pop in" animation
    const timer = setTimeout(() => setLoaded(true), 100);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Parallax translation: moves away to the top as we scroll down
  const parallaxY = prefersReducedMotion ? 0 : -(scrollY * 0.6);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-background">
      {/* Parallax Container */}
      <div 
        className="absolute w-full h-full will-change-transform"
        style={{ transform: `translateY(${parallaxY}px)` }}
      >
        {/* Pop-in Gradient Layer */}
        <div 
          className={`absolute inset-x-0 bottom-0 top-1/4 transition-all duration-1500 ease-out will-change-transform ${
            loaded ? 'opacity-60 translate-y-0 scale-100' : 'opacity-0 translate-y-full scale-110'
          }`}
          style={{
            background: 'radial-gradient(ellipse at bottom, rgba(139, 92, 246, 0.75) 0%, rgba(249, 115, 22, 0.45) 35%, rgba(239, 68, 68, 0.2) 55%, transparent 80%)',
            filter: 'blur(100px)',
          }}
        />
      </div>
    </div>
  );
}
