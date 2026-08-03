import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { CertificateStack } from './CertificateStack';

const linkClass =
  'text-xs font-medium text-foreground/65 transition-colors hover:text-primary sm:text-sm';

export function Footer() {
  return (
    <footer className="mt-auto px-3 pb-3 pt-4 sm:px-4 sm:pb-4" dir="rtl">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <BrandLogo size="sm" />
              <div className="min-w-0 space-y-1 text-xs text-muted sm:text-sm">
                <p className="line-clamp-2 leading-relaxed">{fa.footer.tagline}</p>
                <p>
                  <span className="font-bold text-foreground">{fa.footer.phoneLabel}:</span>{' '}
                  <span className="tabular-nums tracking-wide" dir="ltr">
                    {fa.footer.phoneValue}
                  </span>
                  <span className="mx-2 text-border">|</span>
                  <span className="font-bold text-foreground">{fa.footer.emailLabel}:</span>{' '}
                  <span dir="ltr">{fa.footer.emailValue}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:justify-end sm:text-sm">
              <Link to="/events" className={linkClass}>
                {fa.footer.events}
              </Link>
              <Link to="/archive" className={linkClass}>
                {fa.footer.archive}
              </Link>
              <Link to="/about" className={linkClass}>
                {fa.footer.about}
              </Link>
              <Link to="/contact" className={linkClass}>
                {fa.footer.contact}
              </Link>
              <Link to="/privacy" className={linkClass}>
                {fa.footer.privacy}
              </Link>
              <Link to="/terms" className={linkClass}>
                {fa.footer.terms}
              </Link>
            </div>

            <div className="shrink-0 lg:w-48">
              <p className="mb-1 text-center text-[10px] font-extrabold text-foreground lg:text-start">
                {fa.footer.trustTitle}
              </p>
              <CertificateStack compact />
            </div>
          </div>

          <div className="mt-4 border-t border-border/70 pt-3 text-center">
            <p className="text-xs font-medium text-muted sm:text-sm">{fa.footer.rights}</p>
            <p className="mt-0.5 text-xs font-bold text-foreground/80 sm:text-sm">
              {fa.footer.designedBy}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
