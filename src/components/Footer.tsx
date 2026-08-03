import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loginUrl } from '../lib/auth';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { CertificateStack } from './CertificateStack';

const linkClass =
  'rounded-sm text-sm font-medium text-foreground/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const colTitleClass =
  'mb-3 text-[11px] font-extrabold tracking-wide text-foreground/45';

function FooterNavCol({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <p className={colTitleClass}>{title}</p>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </nav>
  );
}

export function Footer() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="relative mt-auto overflow-hidden" dir="rtl">
      {/* Abstract atmosphere — brand tones, calm geometry */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-light/35 to-primary/[0.06]" />
        <div className="absolute -start-20 top-0 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -end-16 bottom-0 h-64 w-64 rounded-full bg-accent-orange/[0.12] blur-3xl" />
        <div className="absolute start-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-cyan/[0.08] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <svg
          className="absolute inset-x-0 top-0 h-full w-full text-primary/10"
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 180 C 220 80, 420 260, 640 140 S 980 40, 1200 160"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M0 240 C 280 160, 500 300, 760 200 S 1040 120, 1200 220"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.55"
          />
        </svg>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-10 sm:px-6 sm:pb-8 sm:pt-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.65fr)_auto] lg:items-start lg:gap-12">
          {/* Brand */}
          <div className="min-w-0 space-y-4">
            <BrandLogo size="md" />
            <p className="max-w-sm text-sm leading-relaxed text-muted">{fa.footer.tagline}</p>
            <dl className="space-y-1.5 text-xs text-foreground/70 sm:text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt className="font-bold text-foreground">{fa.footer.phoneLabel}</dt>
                <dd className="tabular-nums tracking-wide" dir="ltr">
                  {fa.footer.phoneValue}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt className="font-bold text-foreground">{fa.footer.emailLabel}</dt>
                <dd dir="ltr">{fa.footer.emailValue}</dd>
              </div>
            </dl>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10">
            <FooterNavCol title={fa.footer.product}>
              <li>
                <Link to="/events" className={linkClass}>
                  {fa.footer.events}
                </Link>
              </li>
              <li>
                <Link to="/archive" className={linkClass}>
                  {fa.footer.archive}
                </Link>
              </li>
            </FooterNavCol>

            <FooterNavCol title={fa.footer.company}>
              <li>
                <Link to="/about" className={linkClass}>
                  {fa.footer.about}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  {fa.footer.contact}
                </Link>
              </li>
              <li>
                {user ? (
                  <Link to="/profile" className={linkClass}>
                    {fa.nav.profile}
                  </Link>
                ) : (
                  <Link to={loginUrl()} className={linkClass}>
                    {fa.nav.loginSignup}
                  </Link>
                )}
              </li>
            </FooterNavCol>

            <FooterNavCol title={fa.footer.legal}>
              <li>
                <Link to="/privacy" className={linkClass}>
                  {fa.footer.privacy}
                </Link>
              </li>
              <li>
                <Link to="/terms" className={linkClass}>
                  {fa.footer.terms}
                </Link>
              </li>
            </FooterNavCol>
          </div>

          {/* Trust / certificates */}
          <div className="flex flex-col items-center lg:items-stretch lg:w-48">
            <p className={`${colTitleClass} text-center lg:text-start`}>{fa.footer.trustTitle}</p>
            <CertificateStack compact />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/50 pt-5 text-center sm:flex-row sm:text-start">
          <p className="text-xs font-medium text-muted sm:text-sm">{fa.footer.rights}</p>
          <p className="text-xs font-bold text-foreground/75 sm:text-sm">{fa.footer.designedBy}</p>
        </div>
      </div>
    </footer>
  );
}
