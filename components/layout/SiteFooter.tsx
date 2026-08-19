import Link from "next/link";
import styles from "./SiteFooter.module.scss";
import BrandMark from "@/components/BrandMark";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import { getSocialLinks } from "@/lib/queries/settings";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import SocialLinks from "@/components/SocialLinks";

interface SiteFooterProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Fußzeile mit Inhalts-, Über- und Rechts-Links (SPEC §12: Footer-Pflichtlinks).
 *
 * Die drei Spalten sind `nav`-Bereiche mit Listen, nicht lose Links in einem
 * `div`: Screenreader kündigen so „Liste mit 4 Einträgen" an und können die
 * Gruppen anspringen. Die Spaltenüberschriften sind `h2` — vorher standen dort
 * `h4` und damit sprang die Gliederung auf JEDER Seite von h1 auf h4.
 */
export default async function SiteFooter({ locale, dict }: SiteFooterProps) {
  // Kein hartkodiertes Jahr: eine Website, die im Januar noch das Vorjahr
  // ausweist, wirkt verwaist (Audit 1.5).
  const year = new Date().getFullYear();
  const l = (segment: string) => `/${locale}/${segment}`;
  // Nur gepflegte Profile anzeigen (SPEC: keine toten „#"-Links).
  const social = await getSocialLinks();
  // Ein beworbener Feed ohne Einträge ist ein totes Versprechen (Audit 6.3):
  // der RSS-Link erscheint erst mit der ersten veröffentlichten Depesche.
  const dispatches = await getPublishedDispatches(locale);

  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <div className={styles.brand}>
            <BrandMark size={38} className={styles.sigil} />
            <span className={styles.brandText}>
              <b>{dict.brand.name}</b>
              <span>{dict.brand.domain}</span>
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: "34ch" }}>
            {dict.brand.tagline}
          </p>
          <SocialLinks social={social} className={styles.socials} />
        </div>

        <nav aria-labelledby="footer-content" className={styles.col}>
          <h2 id="footer-content">{dict.footer.contentHeading}</h2>
          <ul>
            <li><Link href={l("einsaetze")}>{dict.nav.einsaetze}</Link></li>
            <li><Link href={l("identitaeten")}>{dict.nav.identitaeten}</Link></li>
            <li><Link href={l("depeschen")}>{dict.dispatch.namePlural}</Link></li>
            <li><Link href={l("briefings")}>{dict.nav.briefings}</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-about" className={styles.col}>
          <h2 id="footer-about">{dict.footer.aboutHeading}</h2>
          <ul>
            <li><Link href={l("legende")}>{dict.nav.legende}</Link></li>
            <li><Link href={l("akte")}>{dict.nav.akte}</Link></li>
            <li><Link href={l("publikationen")}>{dict.nav.publikationen}</Link></li>
            <li><Link href={l("ausbildung")}>{dict.nav.ausbildung}</Link></li>
            {dispatches.length > 0 ? (
              <li><a href={`/feed${locale === "en" ? ".en" : ""}.xml`}>{dict.footer.rss}</a></li>
            ) : null}
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal" className={styles.col}>
          <h2 id="footer-legal">{dict.footer.legalHeading}</h2>
          <ul>
            <li><Link href={l("impressum")}>{dict.footer.imprint}</Link></li>
            <li><Link href={l("datenschutz")}>{dict.footer.privacy}</Link></li>
            <li><Link href={l("barrierefreiheit")}>{dict.footer.accessibility}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="wrap">
        <p className={styles.note}>
          © {year} Nicole Enders · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
