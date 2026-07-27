import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type Props = {
  title: string;
  lead?: string;
  children: React.ReactNode;
};

export function StaticPage({ title, lead, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8" dir="rtl">
      <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm sm:p-10">
        <p className="mb-2 text-xs font-bold text-muted">{fa.info.updatedAt}</p>
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

export function TrustBadges() {
  const items = [
    {
      title: fa.footer.enamad,
      hint: fa.footer.enamadHint,
    },
    {
      title: fa.footer.paymentCert,
      hint: fa.footer.paymentCertHint,
    },
    {
      title: fa.footer.businessLicense,
      hint: fa.footer.businessLicenseHint,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 px-4 py-5 text-center"
        >
          <span className="mb-2 rounded-full bg-primary-light px-2.5 py-0.5 text-[10px] font-black text-primary">
            {fa.footer.placeholderBadge}
          </span>
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-white text-xs font-black text-muted">
            {item.title.slice(0, 2)}
          </div>
          <p className="text-sm font-extrabold text-foreground">{item.title}</p>
          <p className="mt-1 text-xs text-muted">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
