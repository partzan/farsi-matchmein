import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  return (
    <footer className="mt-auto relative overflow-hidden" dir="rtl">
      <div className="h-[3px] bg-gradient-to-l from-accent-orange via-accent-purple to-accent-cyan" />
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark text-primary-light/75 relative">
        <div className="absolute -top-24 -start-16 w-72 h-72 rounded-full bg-accent-purple/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -end-10 w-64 h-64 rounded-full bg-accent-orange/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-12">
            <div className="max-w-md">
              <BrandLogo size="lg" />
              <p className="mt-5 text-base leading-relaxed text-primary-light/80">
                {fa.footer.tagline}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-12 flex-1 lg:max-w-2xl">
              <div>
                <h4 className="font-extrabold text-white mb-4 text-sm tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                  {fa.footer.product}
                </h4>
                <ul className="space-y-3">
                  <li><Link to="/events" className="text-primary-light/70 hover:text-accent-cyan transition-colors text-sm">{fa.footer.discoverEvents}</Link></li>
                  <li><Link to="/" className="text-primary-light/70 hover:text-accent-cyan transition-colors text-sm">{fa.footer.howItWorks}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-white mb-4 text-sm tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                  {fa.footer.company}
                </h4>
                <ul className="space-y-3">
                  <li><Link to="/" className="text-primary-light/70 hover:text-accent-orange transition-colors text-sm">{fa.footer.about}</Link></li>
                  <li><Link to="/" className="text-primary-light/70 hover:text-accent-orange transition-colors text-sm">{fa.footer.contact}</Link></li>
                </ul>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h4 className="font-extrabold text-white mb-4 text-sm tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  {fa.footer.legal}
                </h4>
                <ul className="space-y-3">
                  <li><Link to="/" className="text-primary-light/70 hover:text-accent-purple transition-colors text-sm">{fa.footer.privacy}</Link></li>
                  <li><Link to="/" className="text-primary-light/70 hover:text-accent-purple transition-colors text-sm">{fa.footer.terms}</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-primary-light/50 text-sm">
              © {new Date().getFullYear()} {fa.brand}
              <span className="text-accent-cyan mx-1.5">·</span>
              {fa.brandEn}
            </p>
            <p className="text-primary-light/40 text-xs">{fa.footer.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
