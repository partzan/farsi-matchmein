import { useState } from 'react';
import {
  Vote,
  TrendingUp,
  EyeOff,
  CreditCard,
  Bell,
  MessageSquareHeart,
  Award,
  Sparkles,
} from 'lucide-react';
import { FlipCard } from './FlipCard';
import { fa } from '../locale/fa';

const STEP_KEYS = ['voting', 'trends', 'anonymous', 'fees', 'notify', 'feedback', 'rewards', 'ai'] as const;
const STEP_ICONS = [Vote, TrendingUp, EyeOff, CreditCard, Bell, MessageSquareHeart, Award, Sparkles];
const STEP_GRADIENTS = [
  'from-primary via-accent-purple to-primary-dark',
  'from-accent-orange via-amber-500 to-accent-red',
  'from-gray-700 via-gray-800 to-black',
  'from-accent-red via-rose-500 to-accent-orange',
  'from-primary-dark via-primary to-accent-purple',
  'from-accent-purple via-primary to-accent-orange',
  'from-amber-500 via-accent-orange to-accent-red',
  'from-accent-purple via-primary to-accent-orange',
];
const STEP_ACCENTS = [
  'bg-primary/20', 'bg-accent-orange/20', 'bg-white/10', 'bg-accent-red/20',
  'bg-primary-light/30', 'bg-accent-purple/20', 'bg-amber-500/20', 'bg-accent-purple/20',
];

export function PlatformInfoTiles() {
  const [flippedKey, setFlippedKey] = useState<string | null>(null);

  const steps = STEP_KEYS.map((key, i) => {
    const s = fa.platform.steps[key];
    return {
      key,
      step: String(i + 1).padStart(2, '0'),
      title: s.title,
      tagline: s.tagline,
      description: s.description,
      icon: STEP_ICONS[i],
      gradient: STEP_GRADIENTS[i],
      accent: STEP_ACCENTS[i],
    };
  });

  return (
    <section className="relative py-12 sm:py-16 overflow-hidden -mt-2">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary-light/20 to-background pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-accent-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            {fa.platform.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed h-[4.5rem] sm:h-[4.75rem] overflow-hidden line-clamp-3 px-1">
            {fa.platform.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7 justify-items-center">
          {steps.map((item) => {
            const Icon = item.icon;
            const isFlipped = flippedKey === item.key;

            return (
              <FlipCard
                key={item.key}
                flipped={isFlipped}
                width="100%"
                height={300}
                className="w-full max-w-[280px]"
                onMouseOver={() => setFlippedKey(item.key)}
                onMouseOut={() => setFlippedKey(null)}
                onClick={() => setFlippedKey(isFlipped ? null : item.key)}
                style={{ wrapper: { maxWidth: 280 } }}
                frontChild={
                  <div className={`h-full w-full rounded-3xl bg-gradient-to-br ${item.gradient} p-5 flex flex-col justify-between text-white shadow-xl shadow-primary/15 border border-white/20`}>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl ${item.accent} backdrop-blur-sm flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-white/60 text-xs font-bold">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-white/75 text-xs font-bold mb-1">{item.title}</p>
                      <h3 className="text-xl font-extrabold leading-snug line-clamp-3 min-h-[3.75rem]">{item.tagline}</h3>
                    </div>
                    <p className="text-white/65 text-xs font-medium">{fa.platform.flipHint}</p>
                  </div>
                }
                backChild={
                  <div className="h-full w-full rounded-3xl bg-white p-5 flex flex-col border border-gray-100 shadow-xl text-start">
                    <span className="text-primary text-xs font-extrabold">{item.step} · {item.title}</span>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-2 mb-3 leading-snug line-clamp-2">{item.tagline}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed flex-1 overflow-hidden line-clamp-6">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-3 font-medium">{fa.platform.comingSoon}</p>
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
