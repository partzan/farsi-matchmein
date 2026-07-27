import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';
import { TrustBadges } from './StaticPage';

const linkClass =
  'text-sm font-medium text-foreground/65 transition-colors hover:text-primary';

export function Footer() {
  return (
    <footer className="mt-auto px-3 pb-4 pt-8 sm:px-4 sm:pb-6" dir="rtl">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-border/70 bg-white shadow-sm">
        <div className="px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
          <div className="mb-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-md">
              <BrandLogo size="lg" />
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                {fa.footer.tagline}
              </p>
              <div className="mt-5 space-y-1.5 text-sm text-muted">
                <p>
                  <span className="font-bold text-foreground">{fa.footer.phoneLabel}:</span>{' '}
                  <span className="tabular-nums tracking-wide" dir="ltr">
                    {fa.footer.phoneValue}
                  </span>
                </p>
                <p>
                  <span className="font-bold text-foreground">{fa.footer.emailLabel}:</span>{' '}
                  <span dir="ltr">{fa.footer.emailValue}</span>
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:max-w-2xl lg:gap-12">
              <div>
                <h4 className="mb-4 text-sm font-extrabold text-foreground">
                  {fa.footer.product}
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/events" className={linkClass}>
                      {fa.footer.discoverEvents}
                    </Link>
                  </li>
                  <li>
                    <Link to="/#how" className={linkClass}>
                      {fa.footer.howItWorks}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-extrabold text-foreground">
                  {fa.footer.company}
                </h4>
                <ul className="space-y-3">
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
                </ul>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h4 className="mb-4 text-sm font-extrabold text-foreground">
                  {fa.footer.legal}
                </h4>
                <ul className="space-y-3">
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
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="mb-4 text-sm font-extrabold text-foreground">
              {fa.footer.trustTitle}
            </h4>
            <TrustBadges />
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 sm:flex-row">
            <p className="text-sm text-muted">
              © {new Date().getFullYear()} {fa.brand}
              <span className="mx-1.5 text-primary/40">·</span>
              {fa.brandEn}
            </p>
            <p className="text-xs text-muted/80">{fa.footer.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
