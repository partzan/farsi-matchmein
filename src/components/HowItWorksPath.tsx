import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

const STEP_GRADIENTS = [
  'from-primary via-primary-mid to-accent-purple',
  'from-accent-orange via-amber-500 to-accent-red',
  'from-emerald-400 via-teal-500 to-cyan-600',
];

const STEP_LINKS = ['/profile-setup', '/events', '/discover'];
const STEP_NUMBERS = ['۱', '۲', '۳'];

/** Curvy gradient string pointing to the next step (RTL: right → left). */
function StringConnector({ id, flip }: { id: string; flip?: boolean }) {
  const bend1 = flip ? 58 : 6;
  const bend2 = flip ? 6 : 58;
  return (
    <svg
      viewBox="0 0 120 64"
      className="hidden w-24 shrink-0 self-center md:block lg:w-36"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#C026D3" />
          <stop offset="1" stopColor="#FF6B2C" />
        </linearGradient>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#FF6B2C" />
        </marker>
      </defs>
      <path
        d={`M114,32 C84,${bend1} 36,${bend2} 10,32`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        markerEnd={`url(#${id}-arrow)`}
        className="path-flow"
      />
    </svg>
  );
}

/** Vertical string for mobile (top → bottom). */
function StringConnectorVertical({ id, flip }: { id: string; flip?: boolean }) {
  const bend1 = flip ? 54 : 10;
  const bend2 = flip ? 10 : 54;
  return (
    <svg viewBox="0 0 64 88" className="mx-auto h-20 w-16 md:hidden" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C026D3" />
          <stop offset="1" stopColor="#FF6B2C" />
        </linearGradient>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#FF6B2C" />
        </marker>
      </defs>
      <path
        d={`M32,6 C${bend1},30 ${bend2},56 32,80`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        markerEnd={`url(#${id}-arrow)`}
        className="path-flow"
      />
    </svg>
  );
}

function StepNode({ index }: { index: number }) {
  const step = fa.home.howSteps[index];
  return (
    <div className="group relative flex w-full max-w-[240px] flex-col items-center text-center">
      <div className="relative">
        <div
          className={`flex h-24 w-24 rotate-3 items-center justify-center rounded-[2rem] bg-gradient-to-br text-5xl shadow-xl shadow-primary/20 transition-all duration-300 group-hover:rotate-0 group-hover:scale-110 ${STEP_GRADIENTS[index]}`}
        >
          <span className="drop-shadow-md">{step.emoji}</span>
        </div>
        <span className="absolute -top-2 -start-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-light bg-white text-base font-black text-primary shadow-md">
          {STEP_NUMBERS[index]}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-extrabold leading-snug text-foreground">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
      <Link
        to={STEP_LINKS[index]}
        className="mt-3 inline-flex items-center gap-1 text-sm font-black text-primary transition-colors hover:text-accent-purple"
      >
        بزن بریم ←
      </Link>
    </div>
  );
}

export function HowItWorksPath() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16" dir="rtl">
      <div className="pointer-events-none absolute -top-10 left-1/4 h-72 w-72 rounded-full bg-accent-purple/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent-orange/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {fa.home.howTitle}
          </h2>
          <p className="mt-3 text-base font-medium text-muted sm:text-lg">{fa.home.howHint}</p>
        </div>

        {/* Desktop: step ~string~ step ~string~ step / Mobile: vertical with strings */}
        <div className="flex flex-col items-center md:flex-row md:items-start md:justify-center">
          <StepNode index={0} />
          <StringConnector id="how-string-1" />
          <StringConnectorVertical id="how-string-1-v" />
          <StepNode index={1} />
          <StringConnector id="how-string-2" flip />
          <StringConnectorVertical id="how-string-2-v" flip />
          <StepNode index={2} />
        </div>
      </div>
    </section>
  );
}
