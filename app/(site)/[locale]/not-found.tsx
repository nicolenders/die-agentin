import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { LOCALE_HEADER } from "@/lib/routing";

// Lokalisierte 404-Seite (Audit 6.6). `not-found.tsx` bekommt im App Router
// keine `params`; die Sprache kommt deshalb aus dem Header, den die Middleware
// aus dem Pfad setzt. Ohne Header (etwa bei einem direkten Aufruf ohne
// Middleware) bleibt es bei der Standardsprache.
export default async function NotFound() {
  const locale = (await headers()).get(LOCALE_HEADER);
  const active = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(active);
  return (
    <section style={{ padding: "80px 0" }} lang={active}>
      <p className="eyebrow">404</p>
      <h1>{dict.errors.notFound}</h1>
      <p className="lead">{dict.errors.notFoundHint}</p>
      {/* Der Markenname war hier eine Handlungsaufforderung, die keine war. */}
      <Link className="btn" href={`/${active}`} style={{ marginTop: 20 }}>
        {dict.errors.backToHq}
      </Link>
    </section>
  );
}
