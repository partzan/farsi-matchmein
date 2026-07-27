import { StaticPage } from '../components/StaticPage';
import { fa } from '../locale/fa';

export function Terms() {
  const { terms } = fa.info;
  return (
    <StaticPage title={terms.title} lead={terms.intro}>
      {terms.sections.map((s) => (
        <section key={s.heading} className="space-y-2">
          <h2 className="text-lg font-extrabold text-foreground">{s.heading}</h2>
          <p className="text-sm leading-8 text-foreground/80 sm:text-base">{s.body}</p>
        </section>
      ))}
    </StaticPage>
  );
}
