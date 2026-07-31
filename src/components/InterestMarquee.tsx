import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type Chip = { label: string };

const ROW_1: Chip[] = [
  { label: 'فوتبال' },
  { label: 'غذای خیابانی' },
  { label: 'سینما' },
  { label: 'بازی رومیزی' },
  { label: 'کمپینگ' },
  { label: 'کارائوکه' },
  { label: 'باشگاه کتاب' },
  { label: 'صخره‌نوردی' },
  { label: 'نقاشی' },
  { label: 'دورهمی قهوه' },
  { label: 'ورزش‌های رزمی' },
  { label: 'تئاتر' },
];

const ROW_2: Chip[] = [
  { label: 'یوگا' },
  { label: 'بازی ویدیویی' },
  { label: 'کوه‌پیمایی' },
  { label: 'عکاسی' },
  { label: 'بسکتبال' },
  { label: 'شیرینی‌پزی' },
  { label: 'شعر و ادبیات' },
  { label: 'موسیقی زنده' },
  { label: 'کار داوطلبانه' },
  { label: 'شطرنج' },
  { label: 'گشت‌وگذار شهری' },
  { label: 'بدنسازی' },
];

function ChipPill({ chip }: { chip: Chip }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/80 px-4 py-2 text-sm font-semibold tracking-wide text-foreground/85 shadow-[0_1px_0_rgba(32,4,67,0.04)] backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-white hover:text-primary sm:px-5 sm:text-[0.95rem]">
      {chip.label}
    </span>
  );
}

function MarqueeRow({ chips, reverse }: { chips: Chip[]; reverse?: boolean }) {
  return (
    <div className="marquee" dir="ltr">
      <div className={`marquee-track ${reverse ? 'marquee-track--reverse' : ''}`}>
        {[...chips, ...chips].map((chip, i) => (
          <ChipPill key={`${chip.label}-${i}`} chip={chip} />
        ))}
      </div>
    </div>
  );
}

export function InterestMarquee() {
  return (
    <section className="relative overflow-hidden py-14 sm:py-16" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-white/40 to-background" />
      <div className="relative">
        <div className="mx-auto mb-10 max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {fa.home.vibesTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{fa.home.vibesHint}</p>
        </div>

        <div className="space-y-3.5">
          <MarqueeRow chips={ROW_1} />
          <MarqueeRow chips={ROW_2} reverse />
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/profile-setup"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-white px-6 py-2.5 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary hover:text-white"
          >
            {fa.home.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
