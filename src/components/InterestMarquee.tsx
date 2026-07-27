import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type Chip = { emoji: string; label: string; gradient: string };

/* Gradients follow the profile interest categories for a consistent look */
const G = {
  food: 'from-amber-400 to-rose-500',
  nature: 'from-emerald-400 to-teal-600',
  culture: 'from-indigo-400 to-purple-600',
  games: 'from-violet-500 to-fuchsia-500',
  cinema: 'from-rose-500 to-red-600',
  sport: 'from-lime-400 to-green-600',
  lifestyle: 'from-teal-400 to-emerald-600',
  art: 'from-fuchsia-500 to-purple-700',
  social: 'from-sky-400 to-blue-600',
};

const ROW_1: Chip[] = [
  { emoji: '⚽', label: 'فوتبال', gradient: G.sport },
  { emoji: '🍕', label: 'غذای خیابانی', gradient: G.food },
  { emoji: '🎬', label: 'سینما', gradient: G.cinema },
  { emoji: '🎲', label: 'بازی رومیزی', gradient: G.games },
  { emoji: '🏕️', label: 'کمپینگ', gradient: G.nature },
  { emoji: '🎤', label: 'کارائوکه', gradient: G.games },
  { emoji: '📚', label: 'باشگاه کتاب‌خوانی', gradient: G.culture },
  { emoji: '🧗', label: 'صخره‌نوردی', gradient: G.nature },
  { emoji: '🎨', label: 'نقاشی', gradient: G.art },
  { emoji: '☕', label: 'دورهمی قهوه', gradient: G.food },
  { emoji: '🥋', label: 'ورزش‌های رزمی', gradient: G.sport },
  { emoji: '🎭', label: 'تئاتر', gradient: G.cinema },
];

const ROW_2: Chip[] = [
  { emoji: '🧘', label: 'یوگا', gradient: G.lifestyle },
  { emoji: '🎮', label: 'بازی ویدیویی', gradient: G.games },
  { emoji: '🥾', label: 'کوه‌پیمایی', gradient: G.nature },
  { emoji: '📸', label: 'عکاسی', gradient: G.art },
  { emoji: '🏀', label: 'بسکتبال', gradient: G.sport },
  { emoji: '🍰', label: 'شیرینی‌پزی', gradient: G.food },
  { emoji: '📜', label: 'شعر و ادبیات', gradient: G.culture },
  { emoji: '🎶', label: 'موسیقی زنده', gradient: G.cinema },
  { emoji: '🤝', label: 'کار داوطلبانه', gradient: G.social },
  { emoji: '♟️', label: 'شطرنج', gradient: G.games },
  { emoji: '🚶', label: 'گشت‌وگذار شهری', gradient: G.nature },
  { emoji: '💪', label: 'بدنسازی', gradient: G.sport },
];

function ChipPill({ chip }: { chip: Chip }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-l px-5 py-2.5 text-sm font-black text-white shadow-md transition-transform hover:scale-105 sm:text-base ${chip.gradient}`}
    >
      <span className="text-lg">{chip.emoji}</span>
      {chip.label}
    </span>
  );
}

function MarqueeRow({ chips, reverse }: { chips: Chip[]; reverse?: boolean }) {
  return (
    <div className="marquee" dir="ltr">
      <div className={`marquee-track ${reverse ? 'marquee-track--reverse' : ''}`}>
        {/* duplicated once so the 50% translate loops seamlessly */}
        {[...chips, ...chips].map((chip, i) => (
          <ChipPill key={`${chip.label}-${i}`} chip={chip} />
        ))}
      </div>
    </div>
  );
}

export function InterestMarquee() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-14" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-primary-light/30 to-background" />
      <div className="relative">
        <div className="mx-auto mb-8 max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {fa.home.vibesTitle}
          </h2>
          <p className="mt-3 text-base font-medium text-muted sm:text-lg">{fa.home.vibesHint}</p>
        </div>

        <div className="space-y-4">
          <MarqueeRow chips={ROW_1} />
          <MarqueeRow chips={ROW_2} reverse />
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/profile-setup"
            className="inline-block rounded-full border-2 border-primary px-7 py-3 text-sm font-black text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg sm:text-base"
          >
            {fa.home.ctaSecondary} ←
          </Link>
        </div>
      </div>
    </section>
  );
}
