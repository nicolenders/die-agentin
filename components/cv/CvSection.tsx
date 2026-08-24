import type { ReactNode } from "react";

// Bausteine des Lebenslauf-Dokuments. Ein Lebenslauf ist eine Tabelle ohne
// Tabelle: links der Zeitraum, rechts die Station. Diese beiden Bausteine —
// Abschnitt und Zeile — bilden jeden Bereich des Dokuments, damit alle
// Datumsspalten auf derselben Kante stehen.

/** Ein Abschnitt mit Überschrift. Ohne Inhalt erscheint er nicht. */
export function CvSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-h2">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Eine Zeile: Zeitspalte links, Inhalt rechts. Fehlt die Zeitangabe, bleibt
 * die Spalte leer — die Kante bleibt trotzdem stehen, sonst rutscht ein
 * einzelner Eintrag aus der Flucht.
 */
export function CvRow({
  when,
  aside,
  children,
}: {
  when: string | null;
  /** Zweite Zeile in der Zeitspalte, z. B. Laufzeit des Projekts oder Aufwand. */
  aside?: (string | null)[];
  children: ReactNode;
}) {
  const extras = (aside ?? []).filter((x): x is string => Boolean(x));
  return (
    <div className="cv-row">
      <div className="cv-when">
        {when ? <span className="cv-when-main">{when}</span> : null}
        {extras.map((line) => (
          <span key={line} className="cv-when-extra">
            {line}
          </span>
        ))}
      </div>
      <div className="cv-what">{children}</div>
    </div>
  );
}

/** Titelzeile einer Station: Position fett, Organisation dahinter. */
export function CvRowTitle({ title, org }: { title: string; org?: string | null }) {
  return (
    <p className="cv-row-title">
      <strong>{title}</strong>
      {org ? <span className="cv-row-org"> · {org}</span> : null}
    </p>
  );
}

/** Technologien/Schlagworte einer Station, als eine ruhige Zeile. */
export function CvTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return <p className="cv-row-tags">{tags.join(" · ")}</p>;
}
