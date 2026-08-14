import Link from "next/link";
import type { IdentityCard as IdentityCardData } from "@/lib/queries/identities";
import styles from "./IdentityCard.module.scss";

// Zwei Darstellungen derselben Identitätskarte:
//  - compact: platzsparende Zeile (Startseite, Legende) — Porträt-Avatar + Text.
//  - feature: Übersichtskarte mit Umschlag als Banner und überlagertem Porträt
//    (wie ein Social-Media-Profil).
// Dekorative Karten-Thumbnails: schlichtes <img> vom Same-Origin-/media-Proxy
// (keine Lightbox in einer klickbaren Karte).

function href(locale: string, slug: string) {
  return `/${locale}/identitaeten/${slug}`;
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
        <img src={i.portraitUrl} alt={i.portraitAlt} className={styles.avatar} loading="lazy" />
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
          <img src={i.envelopeUrl} alt={i.envelopeAlt} className={styles.banner} loading="lazy" />
        ) : (
          <span aria-hidden className={styles.bannerFallback} style={{ background: i.color, opacity: 0.22 }} />
        )}
        {i.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.portraitUrl} alt={i.portraitAlt} className={styles.featureAvatar} loading="lazy" />
        ) : (
          <span aria-hidden className={styles.featureAvatarFallback} style={{ background: i.color }} />
        )}
      </span>
      <span className={styles.featureBody}>
        {i.registryCode ? <p className={styles.code}>{i.registryCode}</p> : null}
        <p className={styles.name} style={{ fontSize: 17 }}>{i.name}</p>
        <p className={styles.role}>{i.role}</p>
        {i.tagline ? <p className={styles.tagline}>{i.tagline}</p> : null}
      </span>
    </Link>
  );
}
