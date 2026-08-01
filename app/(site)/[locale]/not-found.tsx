import Link from "next/link";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

// Lokalisierte 404-Seite. Fällt auf DE zurück, da der Segment-Parameter hier
// nicht garantiert verfügbar ist.
export default async function NotFound() {
  const dict = await getDictionary(defaultLocale);
  return (
    <section style={{ padding: "80px 0" }}>
      <p className="eyebrow">404</p>
      <h1>{dict.errors.notFound}</h1>
      <p className="lead">{dict.errors.notFoundHint}</p>
      <Link className="btn" href={`/${defaultLocale}`} style={{ marginTop: 20 }}>
        {dict.brand.name}
      </Link>
    </section>
  );
}
