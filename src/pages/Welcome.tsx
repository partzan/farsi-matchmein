import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

/** Post-login CTA → Event Vote Page */
export function Welcome() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col justify-center px-4 py-12" dir="rtl">
      <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-sm font-bold text-accent-cyan">{fa.brand}</p>
        <h1 className="mt-3 text-2xl font-black text-foreground sm:text-3xl">
          {fa.welcome.title}
        </h1>
        <p className="mt-3 text-muted leading-relaxed">{fa.welcome.subtitle}</p>
        <Link
          to="/events"
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-l from-primary via-primary-mid to-accent-purple px-6 py-4 text-lg font-bold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
        >
          {fa.welcome.cta}
        </Link>
        <Link
          to="/profile-setup"
          className="mt-4 inline-block text-sm font-semibold text-muted hover:text-primary"
        >
          {fa.welcome.editProfile}
        </Link>
      </div>
    </div>
  );
}
