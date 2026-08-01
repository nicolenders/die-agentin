import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getLegalDoc, type LegalKey } from "@/lib/queries/legal";
import { formatDate } from "@/lib/format";

const DEFAULT_TITLE: Record<LegalKey, { de: string; en: string }> = {
  IMPRINT: { de: "Impressum", en: "Imprint" },
  PRIVACY: { de: "Datenschutzerklärung", en: "Privacy policy" },
  ACCESSIBILITY: { de: "Erklärung zur Barrierefreiheit", en: "Accessibility statement" },
};

// Gemeinsame Darstellung einer Rechtsseite. Reiner Text, kein
// dangerouslySetInnerHTML. Ist noch kein Inhalt gepflegt, erscheint ein
// ehrlicher Hinweis statt eines leeren oder erfundenen Textes.
export default async function LegalPage({
  locale,
  docKey,
}: {
  locale: string;
  docKey: LegalKey;
}) {
  if (!isLocale(locale)) notFound();
  const doc = await getLegalDoc(docKey, locale);
  const fallbackTitle = DEFAULT_TITLE[docKey][locale === "en" ? "en" : "de"];

  return (
    <section style={{ padding: "44px 0 90px", maxWidth: 760 }}>
      <h1 style={{ fontSize: "clamp(28px,4vw,44px)" }}>{doc?.title ?? fallbackTitle}</h1>
      {doc ? (
        <>
          <p className="meta">
            {locale === "de" ? "Zuletzt aktualisiert" : "Last updated"} {formatDate(doc.updatedAt, locale)}
          </p>
          {doc.body.split(/\n{2,}/).map((para, i) => (
            <p key={i} style={{ whiteSpace: "pre-wrap" }}>
              {para}
            </p>
          ))}
        </>
      ) : (
        <div className="card bracket" style={{ marginTop: 20 }}>
          <p className="muted">
            {locale === "de"
              ? "Dieser Text wird derzeit gepflegt und rechtlich geprüft."
              : "This text is currently being maintained and legally reviewed."}
          </p>
        </div>
      )}
    </section>
  );
}
