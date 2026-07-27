import { StaticPage } from '../components/StaticPage';
import { fa } from '../locale/fa';

export function About() {
  const { about } = fa.info;
  return (
    <StaticPage title={about.title} lead={about.lead}>
      {about.paragraphs.map((p) => (
        <p key={p.slice(0, 24)} className="text-sm leading-8 sm:text-base">
          {p}
        </p>
      ))}
      <h2 className="pt-2 text-xl font-extrabold text-foreground">{about.valuesTitle}</h2>
      <ul className="space-y-4">
        {about.values.map((v) => (
          <li
            key={v.title}
            className="rounded-2xl border border-border/70 bg-background/50 px-4 py-4"
          >
            <p className="font-extrabold text-primary">{v.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{v.text}</p>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
