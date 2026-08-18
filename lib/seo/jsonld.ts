// Strukturierte Daten (Phase 13.3). Zentrale, typisierte Helfer. Ausgabe als
// <script type="application/ld+json"> im Server Component. Stabile @id über den
// kanonischen Host. Keine Daten in JSON-LD, die nicht auch sichtbar auf der
// Seite stehen.

import { siteOrigin } from "@/lib/site";
import type { Locale } from "@/lib/i18n/config";

export const PERSON_ID = () => `${siteOrigin()}/#person`;
export const WEBSITE_ID = () => `${siteOrigin()}/#website`;

export interface PersonInput {
  name: string;
  jobTitle: string;
  description: string;
  sameAs: string[]; // Social/Profil-URLs
  knowsAbout: string[]; // Fachgebiete
  awards: string[];
}

/** Person-Knoten (`#person`). */
export function personNode(p: PersonInput) {
  const origin = siteOrigin();
  return {
    "@type": "Person",
    "@id": PERSON_ID(),
    name: p.name,
    jobTitle: p.jobTitle,
    description: p.description,
    url: origin,
    ...(p.sameAs.length ? { sameAs: p.sameAs } : {}),
    ...(p.knowsAbout.length ? { knowsAbout: p.knowsAbout } : {}),
    ...(p.awards.length ? { award: p.awards } : {}),
  };
}

/** WebSite-Knoten (`#website`), publisher → Person. */
export function webSiteNode(name: string, locale: Locale) {
  const origin = siteOrigin();
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    url: origin,
    name,
    inLanguage: locale === "de" ? "de-DE" : "en-US",
    publisher: { "@id": PERSON_ID() },
  };
}

export interface ArticleInput {
  headline: string;
  description: string | null;
  url: string;
  datePublished: string | null;
  dateModified: string | null;
  /** Absolute URL des Titelbilds — Suchmaschinen zeigen Beiträge damit als Karte. */
  image?: string | null;
}

/** BlogPosting-Knoten je Depesche. */
export function blogPostingNode(a: ArticleInput) {
  return {
    "@type": "BlogPosting",
    headline: a.headline,
    ...(a.description ? { description: a.description } : {}),
    url: a.url,
    ...(a.datePublished ? { datePublished: a.datePublished } : {}),
    ...(a.dateModified ? { dateModified: a.dateModified } : {}),
    ...(a.image ? { image: a.image } : {}),
    author: { "@id": PERSON_ID() },
  };
}

export interface EventInput {
  name: string;
  startDate: string;
  url: string | null;
  city: string;
  countryCode: string;
  online: boolean;
}

/** Event-Knoten je Einsatz. */
export function eventNode(e: EventInput) {
  const origin = siteOrigin();
  return {
    "@type": "Event",
    name: e.name,
    startDate: e.startDate,
    eventAttendanceMode: e.online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: e.online
      ? { "@type": "VirtualLocation", url: e.url ?? origin }
      : { "@type": "Place", name: e.city, address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.countryCode } },
    performer: { "@id": PERSON_ID() },
    ...(e.url ? { url: e.url } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbNode(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** Baut das @graph-Dokument aus Knoten. */
export function graph(nodes: object[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
