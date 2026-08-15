import Link from "next/link";
import type { IdentityCard as IdentityCardData } from "@/lib/queries/identities";
import styles from "./IdentityCard.module.scss";

// Zwei Darstellungen derselben Identitätskarte:
//  - compact: platzsparende Zeile (Startseite, Legende) — Porträt-Avatar + Text.
//  - feature: Übersichtskarte mit Umschlag als Banner und überlagertem Porträt
//    (wie ein Social-Media-Profil).
// Dekorative Karten-Thumbnails: schlichtes <img> vom Same-Origin-/media-Proxy
// (keine Lightbox in einer klickbaren Karte). KI-generierte Bilder bekommen hier
// KEIN sichtbares Badge — der Hinweis steht nur im Alt-Text (bewusste Entscheidung
// für HQ, Identitäten-Übersicht und Legende).

function href(locale: string, slug: string) {
  return `/${locale}/identitaeten/${slug}`;
}

// Hängt bei KI-generierten Bildern den Hinweis an den Alt-Text an, statt ihn
// sichtbar einzublenden.
function altWithAi(alt: string, ai: boolean, locale: string): string {
  if (!ai) return alt;
  const note = locale === "en" ? "AI-generated" : "KI-generiert";
  return alt ? `${alt} (${note})` : note;
}

export function IdentityCardCompact({
  identity: i,
  locale,
}: {
  identity: IdentityCardData;
  locale: string;
}) {
  return (
    <Link href={href(locale, i.slug)} className={styles.compact} style={{ borderLeftColor: i.color }}>
      {i.portraitUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={i.portraitUrl}
          alt={altWithAi(i.portraitAlt, i.portraitAi, locale)}
          className={styles.avatar}
          loading="lazy"
        />
      ) : (
        <span aria-hidden className={styles.avatarFallback} style={{ background: i.color, opacity: 0.35 }} />
      )}
      <span className={styles.compactBody}>
        {i.registryCode ? <p className={styles.code}>{i.registryCode}</p> : null}
        <p className={styles.name}>{i.name}</p>
        <p className={styles.role}>{i.role}</p>
      </span>
    </Link>
  );
}

/** Raster kompakter Karten: max. 3 pro Zeile (Standard) oder 2 (breitere Boxen,
 *  z. B. in der Legende), unvollständige letzte Zeile mittig. */
export function IdentityCompactGrid({
  identities,
  locale,
  columns = 3,
}: {
  identities: IdentityCardData[];
  locale: string;
  columns?: 2 | 3;
}) {
  const cls = columns === 2 ? `${styles.compactGrid} ${styles.two}` : styles.compactGrid;
  return (
    <div className={cls}>
      {identities.map((i) => (
        <IdentityCardCompact key={i.id} identity={i} locale={locale} />
      ))}
    </div>
  );
}

export function IdentityCardFeature({
  identity: i,
  locale,
}: {
  identity: IdentityCardData;
  locale: string;
}) {
  return (
    <Link href={href(locale, i.slug)} className={styles.feature} style={{ borderTopColor: i.color }}>
      <span className={styles.bannerWrap}>
        {i.envelopeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={i.envelopeUrl}
            alt={altWithAi(i.envelopeAlt, i.envelopeAi, locale)}
            className={styles.banner}
            loading="lazy"
          />
        ) : (
          <span aria-hidden className={styles.bannerFallback} style={{ background: i.color, opacity: 0.22 }} />
        )}
        {i.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={i.portraitUrl}
            alt={altWithAi(i.portraitAlt, i.portraitAi, locale)}
            className={styles.featureAvatar}
            loading="lazy"
          />
        ) : (
          <span aria-hidden className={styles.featureAvatarFallback} style={{ background: i.color }} />
        )}
      </span>
      <span className={styles.featureBody}>
        {i.registryCode ? <p className={styles.code}>{i.registryCode}</p> : null}
        <p className={styles.featureName}>{i.name}</p>
        <p className={styles.featureRole}>{i.role}</p>
        {i.activePeriod ? <p className={styles.featurePeriod}>{i.activePeriod}</p> : null}
        {i.tagline ? (
          <p className={styles.featureTagline}>
            {locale === "en" ? `“${i.tagline}”` : `„${i.tagline}“`}
          </p>
        ) : null}
      </span>
    </Link>
  );
}
