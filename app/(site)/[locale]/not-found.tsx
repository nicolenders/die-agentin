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
      {/* Zwei Ziele statt eines: Ein großer Teil der 404 kommt aus dem
          WordPress-Altbestand — sechs Jahre englischsprachige Fachbeiträge, deren
          Adressen weiter im Index stehen. Wer von dort kommt, sucht Inhalte. Die
          Startseite allein anzubieten schickt ihn an der Antwort vorbei. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
        <Link className="btn solid" href={`/${active}/depeschen`}>
          {dict.errors.toDispatches}
        </Link>
        <Link className="btn" href={`/${active}`}>
          {dict.errors.backToHq}
        </Link>
      </div>
    </section>
  );
}
