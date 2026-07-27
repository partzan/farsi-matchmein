import { Mail, Phone, Clock } from 'lucide-react';
import { StaticPage, TrustBadges } from '../components/StaticPage';
import { fa } from '../locale/fa';

export function Contact() {
  const { contact } = fa.info;
  return (
    <StaticPage title={contact.title} lead={contact.lead}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
          <Phone className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs font-bold text-muted">{contact.phoneLabel}</p>
          <p className="mt-1 font-extrabold tabular-nums tracking-wide" dir="ltr">
            {contact.phoneValue}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
          <Mail className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs font-bold text-muted">{contact.emailLabel}</p>
          <p className="mt-1 font-extrabold" dir="ltr">
            {contact.emailValue}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
          <Clock className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs font-bold text-muted">{contact.hoursLabel}</p>
          <p className="mt-1 text-sm font-extrabold leading-relaxed">{contact.hoursValue}</p>
        </div>
      </div>

      <p className="rounded-2xl border border-dashed border-accent-orange/40 bg-accent-orange/5 px-4 py-3 text-sm leading-relaxed text-muted">
        {contact.note}
      </p>

      <h2 className="text-xl font-extrabold text-foreground">{contact.trustTitle}</h2>
      <TrustBadges />
    </StaticPage>
  );
}
