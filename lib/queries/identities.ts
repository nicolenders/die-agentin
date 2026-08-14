import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { assetUrl } from "@/lib/media/url";
import { parseStringList, identityDisplayName } from "@/lib/identities";
import type { Locale } from "@/lib/i18n/config";

// Datenzugriff für Identitäten (Phase 2). Admin-Lesezugriffe gehen direkt an die
// DB (nur für Admins, brauchen frische Daten); öffentliche Lesezugriffe sind
// getaggt gecacht (SPEC §2.1).

// -------------------------------------------------------------------- Admin

export interface IdentityAdminRow {
  id: string;
  slug: string;
  codenameDe: string;
  roleDe: string;
  color: string;
  published: boolean;
  isPrimary: boolean;
  sortOrder: number;
  portraitUrl: string | null;
  counts: { missions: number; talks: number; publications: number; certifications: number; attributes: number };
}

export async function getIdentitiesAdmin(): Promise<IdentityAdminRow[]> {
  const rows = await db.identity.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      portrait: true,
      _count: { select: { missions: true, talks: true, publications: true, certifications: true, attributes: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    codenameDe: r.codenameDe,
    roleDe: r.roleDe,
    color: r.color,
    published: r.published,
    isPrimary: r.isPrimary,
    sortOrder: r.sortOrder,
    portraitUrl: r.portrait ? assetUrl(r.portrait.blobPath) : null,
    counts: {
      missions: r._count.missions,
      talks: r._count.talks,
      publications: r._count.publications,
      certifications: r._count.certifications,
      attributes: r._count.attributes,
    },
  }));
}

export interface IdentityEditData {
  id: string;
  slug: string;
  codenameDe: string;
  codenameEn: string;
  roleDe: string;
  roleEn: string;
  taglineDe: string;
  taglineEn: string;
  registryCode: string;
  since: string;
  descriptionDe: string;
  descriptionEn: string;
  shortBioDe: string;
  shortBioEn: string;
  focusDe: string[];
  focusEn: string[];
  languages: string[];
  color: string;
  iconKey: string;
  isPrimary: boolean;
  published: boolean;
  metaTitleDe: string;
  metaTitleEn: string;
  metaDescriptionDe: string;
  metaDescriptionEn: string;
  portraitAssetId: string | null;
  portraitUrl: string | null;
  envelopeAssetId: string | null;
  envelopeUrl: string | null;
  ogAssetId: string | null;
  ogUrl: string | null;
  toolIds: string[];
  missionIds: string[];
  talkIds: string[];
  publicationIds: string[];
  certificationIds: string[];
  attributes: {
    id: string;
    labelDe: string;
    labelEn: string;
    valueDe: string;
    valueEn: string;
    displayPublic: boolean;
    sortOrder: number;
  }[];
}

export async function getIdentityForEdit(id: string): Promise<IdentityEditData | null> {
  const r = await db.identity.findUnique({
    where: { id },
    include: {
      portrait: true,
      envelope: true,
      ogAsset: true,
      tools: { select: { id: true } },
      missions: { select: { id: true } },
      talks: { select: { id: true } },
      publications: { select: { id: true } },
      certifications: { select: { id: true } },
      attributes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    codenameDe: r.codenameDe,
    codenameEn: r.codenameEn,
    roleDe: r.roleDe,
    roleEn: r.roleEn,
    taglineDe: r.taglineDe,
    taglineEn: r.taglineEn,
    registryCode: r.registryCode ?? "",
    since: r.since ?? "",
    descriptionDe: r.descriptionDe,
    descriptionEn: r.descriptionEn,
    shortBioDe: r.shortBioDe,
    shortBioEn: r.shortBioEn,
    focusDe: parseStringList(r.focusDe),
    focusEn: parseStringList(r.focusEn),
    languages: parseStringList(r.languages),
    color: r.color,
    iconKey: r.iconKey ?? "",
    isPrimary: r.isPrimary,
    published: r.published,
    metaTitleDe: r.metaTitleDe ?? "",
    metaTitleEn: r.metaTitleEn ?? "",
    metaDescriptionDe: r.metaDescriptionDe ?? "",
    metaDescriptionEn: r.metaDescriptionEn ?? "",
    portraitAssetId: r.portraitAssetId,
    portraitUrl: r.portrait ? assetUrl(r.portrait.blobPath) : null,
    envelopeAssetId: r.envelopeAssetId,
    envelopeUrl: r.envelope ? assetUrl(r.envelope.blobPath) : null,
    ogAssetId: r.ogAssetId,
    ogUrl: r.ogAsset ? assetUrl(r.ogAsset.blobPath) : null,
    toolIds: r.tools.map((t) => t.id),
    missionIds: r.missions.map((m) => m.id),
    talkIds: r.talks.map((t) => t.id),
    publicationIds: r.publications.map((p) => p.id),
    certificationIds: r.certifications.map((c) => c.id),
    attributes: r.attributes.map((a) => ({
      id: a.id,
      labelDe: a.labelDe,
      labelEn: a.labelEn,
      valueDe: a.valueDe,
      valueEn: a.valueEn,
      displayPublic: a.displayPublic,
      sortOrder: a.sortOrder,
    })),
  };
}

/** Optionen für die Verknüpfungs-Mehrfachauswahl im Identitäts-Editor. */
export async function getLinkOptions(): Promise<{
  tools: { id: string; name: string }[];
  missions: { id: string; name: string }[];
  talks: { id: string; name: string }[];
  publications: { id: string; name: string }[];
  certifications: { id: string; name: string }[];
}> {
  const [tools, missions, talks, publications, certifications] = await Promise.all([
    db.tool.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.mission.findMany({ orderBy: { startDate: "desc" }, select: { id: true, eventName: true } }),
    db.talk.findMany({ include: { translations: { where: { locale: "de" }, select: { title: true } } } }),
    db.publication.findMany({ include: { translations: { where: { locale: "de" }, select: { title: true } } } }),
    db.certification.findMany({ orderBy: { acquiredOn: "desc" }, select: { id: true, name: true } }),
  ]);
  return {
    tools: tools.map((t) => ({ id: t.id, name: t.name })),
    missions: missions.map((m) => ({ id: m.id, name: m.eventName })),
    talks: talks.map((t) => ({ id: t.id, name: t.translations[0]?.title ?? t.id })),
    publications: publications.map((p) => ({ id: p.id, name: p.translations[0]?.title ?? p.id })),
    certifications: certifications.map((c) => ({ id: c.id, name: c.name })),
  };
}

// ------------------------------------------------------------------- Public

export interface IdentityCard {
  id: string;
  slug: string;
  name: string; // Deckname mit Rolle-Fallback
  role: string;
  tagline: string;
  color: string;
  registryCode: string | null;
  isPrimary: boolean;
  portraitUrl: string | null;
  portraitAlt: string;
  envelopeUrl: string | null;
  envelopeAlt: string;
}

function toCard(
  r: {
    id: string;
    slug: string;
    codenameDe: string;
    codenameEn: string;
    roleDe: string;
    roleEn: string;
    taglineDe: string;
    taglineEn: string;
    color: string;
    registryCode: string | null;
    isPrimary: boolean;
    portrait: { blobPath: string; altDe: string; altEn: string | null; decorative: boolean } | null;
    envelope: { blobPath: string; altDe: string; altEn: string | null; decorative: boolean } | null;
  },
  locale: Locale,
): IdentityCard {
  const name = identityDisplayName(r, locale);
  const alt = (a: { altDe: string; altEn: string | null } | null, fallback: string) =>
    a ? (locale === "en" && a.altEn ? a.altEn : a.altDe) : fallback;
  return {
    id: r.id,
    slug: r.slug,
    name,
    role: locale === "de" ? r.roleDe : r.roleEn || r.roleDe,
    tagline: locale === "de" ? r.taglineDe : r.taglineEn || r.taglineDe,
    color: r.color,
    registryCode: r.registryCode,
    isPrimary: r.isPrimary,
    portraitUrl: r.portrait ? assetUrl(r.portrait.blobPath) : null,
    portraitAlt: alt(r.portrait, name),
    envelopeUrl: r.envelope ? assetUrl(r.envelope.blobPath) : null,
    envelopeAlt: alt(r.envelope, name),
  };
}

async function loadPublishedIdentities(locale: Locale): Promise<IdentityCard[]> {
  const rows = await db.identity.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { portrait: true, envelope: true },
  });
  return rows.map((r) => toCard(r, locale));
}

export async function getPublishedIdentities(locale: Locale): Promise<IdentityCard[]> {
  const run = cachedQuery(loadPublishedIdentities, ["identities", locale], [tags.identityList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

/**
 * Öffentliche Werkzeugliste der Legende: die Vereinigung aller Werkzeuge, die
 * mindestens einer veröffentlichten Identität zugeordnet sind — Duplikate (nach
 * Namen, ohne Groß-/Kleinschreibung) entfernt, alphabetisch sortiert. Ersetzt die
 * frühere freie Werkzeug-Liste der Legende; gepflegt wird jetzt je Identität.
 */
export async function getIdentityToolNames(): Promise<string[]> {
  try {
    const rows = await db.tool.findMany({
      where: { identities: { some: { published: true } } },
      select: { name: true },
    });
    const seen = new Map<string, string>();
    for (const r of rows) {
      const name = r.name.trim();
      const key = name.toLowerCase();
      if (name && !seen.has(key)) seen.set(key, name);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "de"));
  } catch {
    return [];
  }
}

export interface IdentityDetail extends IdentityCard {
  role: string;
  descriptionJson: string;
  since: string | null;
  focus: string[];
  languages: string[];
  attributes: { label: string; value: string }[];
  dispatches: { slug: string; title: string; format: string }[];
  missions: { slug: string | null; eventName: string; city: string; date: Date }[];
  briefings: { title: string }[];
  publications: { title: string; year: number }[];
  certifications: { name: string }[];
}

async function loadIdentityBySlug(locale: Locale, slug: string, nowMs: number): Promise<IdentityDetail | null> {
  const r = await db.identity.findFirst({
    where: { slug, published: true },
    include: {
      portrait: true,
      envelope: true,
      attributes: { where: { displayPublic: true }, orderBy: { sortOrder: "asc" } },
      dispatches: { include: { translations: true } },
      missions: { include: { translations: true } },
      talks: { include: { translations: true } },
      publications: { include: { translations: true } },
      certifications: true,
    },
  });
  if (!r) return null;
  const card = toCard(r, locale);
  const trans = <T extends { locale: string }>(list: T[]): T | undefined =>
    list.find((t) => t.locale === locale) ?? list.find((t) => t.locale === "de");

  return {
    ...card,
    role: locale === "de" ? r.roleDe : r.roleEn || r.roleDe,
    descriptionJson: locale === "en" && r.descriptionEn ? r.descriptionEn : r.descriptionDe,
    since: r.since,
    focus: parseStringList(locale === "en" ? r.focusEn : r.focusDe),
    languages: parseStringList(r.languages),
    attributes: r.attributes.map((a) => ({
      label: locale === "en" && a.labelEn ? a.labelEn : a.labelDe,
      value: locale === "en" && a.valueEn ? a.valueEn : a.valueDe,
    })),
    dispatches: r.dispatches
      .filter((d) => d.status === "PUBLISHED" && (!d.publishedAt || d.publishedAt.getTime() <= nowMs))
      .map((d) => {
        const t = trans(d.translations.filter((x) => x.state === "REVIEWED")) ?? trans(d.translations);
        return t ? { slug: t.slug, title: t.title, format: d.format } : null;
      })
      .filter((x): x is { slug: string; title: string; format: string } => x !== null),
    missions: r.missions
      .filter((m) => m.contentStatus === "PUBLISHED")
      .map((m) => {
        const t = trans(m.translations);
        return { slug: t?.slug ?? null, eventName: m.eventName, city: m.city, date: m.startDate };
      }),
    briefings: r.talks.map((t) => ({ title: trans(t.translations)?.title ?? "" })).filter((b) => b.title),
    publications: r.publications.map((p) => ({ title: trans(p.translations)?.title ?? "", year: p.year })).filter((p) => p.title),
    certifications: r.certifications.map((c) => ({ name: c.name })),
  };
}

export async function getIdentityBySlug(locale: Locale, slug: string): Promise<IdentityDetail | null> {
  const run = cachedQuery(
    (l: Locale, s: string) => loadIdentityBySlug(l, s, Date.now()),
    ["identity", locale, slug],
    [tags.identityList(locale)],
  );
  try {
    return await run(locale, slug);
  } catch {
    return null;
  }
}
