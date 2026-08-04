import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type Props = {
  title: string;
  lead?: string;
  showUpdatedAt?: boolean;
  children: React.ReactNode;
};

export function StaticPage({ title, lead, showUpdatedAt = true, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8" dir="rtl">
      <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm sm:p-10">
        {showUpdatedAt && (
          <p className="mb-2 text-xs font-bold text-muted">{fa.info.updatedAt}</p>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {lead && (
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{lead}</p>
        )}
        <div className="mt-8 space-y-6 text-foreground/85">{children}</div>
        <div className="mt-10 border-t border-border/70 pt-6">
          <Link
            to="/"
            className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary-light"
          >
            ← {fa.info.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export { CertificateStack, TrustBadges } from './CertificateStack';
