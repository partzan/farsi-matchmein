import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

export function Footer() {
  return (
    <footer className="bg-black text-gray-400 mt-auto py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="font-extrabold text-2xl tracking-tight text-white flex items-center mb-4 gap-1">
              <span className="text-primary">★</span> {fa.brand}
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">{fa.footer.tagline}</p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">{fa.footer.product}</h4>
            <ul className="space-y-3">
              <li><Link to="/events" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.discoverEvents}</Link></li>
              <li><Link to="/create-event" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.nav.createEvent}</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.howItWorks}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">{fa.footer.company}</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.about}</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.contact}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">{fa.footer.legal}</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.privacy}</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">{fa.footer.terms}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {fa.brand}. {fa.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
