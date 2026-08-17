import Link from "next/link";
import styles from "./SiteFooter.module.scss";
import BrandMark from "@/components/BrandMark";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";
import { getSocialLinks } from "@/lib/queries/settings";
import SocialLinks from "@/components/SocialLinks";

interface SiteFooterProps {
  locale: Locale;
  dict: Dictionary;
}

/** Fußzeile mit Inhalts-, Über- und Rechts-Links (SPEC §12: Footer-Pflichtlinks). */
export default async function SiteFooter({ locale, dict }: SiteFooterProps) {
  // Kein hartkodiertes Jahr: eine Website, die im Januar noch das Vorjahr
  // ausweist, wirkt verwaist (Audit 1.5).
  const year = new Date().getFullYear();
  const l = (segment: string) => `/${locale}/${segment}`;
  // Nur gepflegte Profile anzeigen (SPEC: keine toten „#"-Links).
  const social = await getSocialLinks();

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

        <div>
          <h4>{dict.footer.contentHeading}</h4>
          <Link href={l("einsaetze")}>{dict.nav.einsaetze}</Link>
          <Link href={l("identitaeten")}>{dict.nav.identitaeten}</Link>
          <Link href={l("depeschen")}>{dict.dispatch.namePlural}</Link>
          <Link href={l("briefings")}>{dict.nav.briefings}</Link>
        </div>

        <div>
          <h4>{dict.footer.aboutHeading}</h4>
          <Link href={l("legende")}>{dict.nav.legende}</Link>
          <Link href={l("akte")}>{locale === "de" ? "Akte (Speaker-Kit)" : "Speaker kit"}</Link>
          <Link href={l("publikationen")}>{dict.nav.publikationen}</Link>
          <Link href={l("ausbildung")}>{dict.nav.ausbildung}</Link>
          <a href={`/feed${locale === "en" ? ".en" : ""}.xml`}>{dict.footer.rss}</a>
        </div>

        <div>
          <h4>{dict.footer.legalHeading}</h4>
          <Link href={l("impressum")}>{dict.footer.imprint}</Link>
          <Link href={l("datenschutz")}>{dict.footer.privacy}</Link>
          <Link href={l("barrierefreiheit")}>{dict.footer.accessibility}</Link>
        </div>
      </div>
      <div className="wrap">
        <p className={styles.note}>
          © {year} Nicole Enders · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
