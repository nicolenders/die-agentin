import { db } from "@/lib/db";
import { identityDisplayName } from "@/lib/identities";
import { formatDate } from "@/lib/format";
import { assetUrl } from "@/lib/media/url";
import { ATTACHMENT_KIND_LABEL, toAttachmentKind } from "@/lib/briefings/attachments";
import {
  matchesAny,
  normalizeQuery,
  previewForAttachment,
  previewForFile,
  rankHits,
  type SearchHit,
} from "@/lib/admin/search";

// Datenzugriff der globalen Adminsuche. Bewusst schlicht: je Bereich eine
// begrenzte Abfrage mit `contains`, danach wird im Speicher gefiltert und
// sortiert (die Datenmengen sind für eine Person überschaubar). Kein
// Volltextindex, nichts zu pflegen.

const PER_ENTITY = 25;

/** Sucht über alle Bereiche. Ein nicht erreichbarer Bereich liefert nichts. */
export async function searchAdmin(rawQuery: string): Promise<SearchHit[]> {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];

  const [
    missions,
    talks,
    dispatches,
    identities,
    publications,
    certifications,
    focus,
    media,
    decks,
    attachments,
  ] =
    await Promise.all([
      searchMissions(q),
      searchTalks(q),
      searchDispatches(q),
      searchIdentities(q),
      searchPublications(q),
      searchCertifications(q),
      searchFocusTopics(q),
      searchMedia(q),
      searchSlideDecks(q),
      searchTalkAttachments(q),
    ]);

  return rankHits(
    [
      ...missions,
      ...talks,
      ...dispatches,
      ...identities,
      ...publications,
      ...certifications,
      ...focus,
      ...media,
      ...decks,
      ...attachments,
    ],
    q,
  );
}

async function safe<T>(run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch {
    // Ein Bereich, der gerade nicht antwortet, darf die Suche nicht kippen.
    return [];
  }
}

function searchMissions(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.mission.findMany({
      where: {
        OR: [{ eventName: { contains: q } }, { city: { contains: q } }],
      },
      orderBy: { startDate: "desc" },
      take: PER_ENTITY,
      select: { id: true, eventName: true, city: true, countryCode: true, startDate: true, contentStatus: true, isOnline: true },
    });
    return rows.map((m) => ({
      entity: "mission" as const,
      id: m.id,
      title: m.eventName,
      detail: `${m.isOnline ? "Online" : `${m.city}, ${m.countryCode}`} · ${formatDate(m.startDate, "de")}`,
      status: m.contentStatus,
      href: `/admin/einsaetze/bearbeiten?id=${m.id}`,
    }));
  });
}

function searchTalks(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.talk.findMany({
      where: { translations: { some: { title: { contains: q } } } },
      take: PER_ENTITY,
      include: { translations: true, categories: { select: { nameDe: true } } },
    });
    return rows.map((t) => {
      const de = t.translations.find((x) => x.locale === "de");
      return {
        entity: "briefing" as const,
        id: t.id,
        title: de?.title ?? t.translations[0]?.title ?? "(ohne Titel)",
        detail: t.categories.map((c) => c.nameDe).join(", ") || "ohne Kategorie",
        status: t.active ? "Sichtbar" : "Verborgen",
        href: `/admin/briefings/bearbeiten?id=${t.id}`,
      };
    });
  });
}

function searchDispatches(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.dispatch.findMany({
      where: {
        translations: { some: { OR: [{ title: { contains: q } }, { summary: { contains: q } }] } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: PER_ENTITY,
      include: { translations: true },
    });
    return rows.map((d) => {
      const de = d.translations.find((x) => x.locale === "de");
      return {
        entity: "dispatch" as const,
        id: d.id,
        title: de?.title ?? d.translations[0]?.title ?? "(ohne Titel)",
        detail: `${d.format}${d.publishedAt ? ` · ${formatDate(d.publishedAt, "de")}` : ""}`,
        status: d.status,
        href: `/admin/depeschen/bearbeiten?id=${d.id}`,
      };
    });
  });
}

function searchIdentities(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.identity.findMany({
      where: {
        OR: [
          { codenameDe: { contains: q } },
          { codenameEn: { contains: q } },
          { roleDe: { contains: q } },
          { roleEn: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      take: PER_ENTITY,
    });
    return rows.map((i) => ({
      entity: "identity" as const,
      id: i.id,
      title: identityDisplayName(i, "de"),
      detail: i.roleDe || i.slug,
      status: i.published ? "Veröffentlicht" : "Entwurf",
      href: `/admin/identitaeten/bearbeiten?id=${i.id}`,
    }));
  });
}

function searchPublications(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.publication.findMany({
      where: {
        OR: [
          { translations: { some: { title: { contains: q } } } },
          { publisher: { contains: q } },
          { isbn: { contains: q } },
        ],
      },
      orderBy: { year: "desc" },
      take: PER_ENTITY,
      include: { translations: true },
    });
    return rows.map((p) => {
      const de = p.translations.find((x) => x.locale === "de");
      return {
        entity: "publication" as const,
        id: p.id,
        title: de?.title ?? p.translations[0]?.title ?? "(ohne Titel)",
        detail: [p.type, p.publisher, String(p.year)].filter(Boolean).join(" · "),
        status: "",
        href: `/admin/publikationen/bearbeiten?pub=${p.id}`,
      };
    });
  });
}

function searchCertifications(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.certification.findMany({
      where: { OR: [{ name: { contains: q } }, { shortCode: { contains: q } }, { series: { contains: q } }] },
      orderBy: { acquiredOn: "desc" },
      take: PER_ENTITY,
    });
    return rows.map((c) => ({
      entity: "certification" as const,
      id: c.id,
      title: c.name,
      detail: [c.shortCode, c.kind, formatDate(c.acquiredOn, "de")].filter(Boolean).join(" · "),
      status: c.status,
      href: "/admin/ausbildung",
    }));
  });
}

function searchFocusTopics(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.focusTopic.findMany({
      where: { OR: [{ titleDe: { contains: q } }, { titleEn: { contains: q } }, { note: { contains: q } }] },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: PER_ENTITY,
      include: { _count: { select: { dispatches: true } } },
    });
    return rows.map((f) => ({
      entity: "focus" as const,
      id: f.id,
      title: f.titleDe,
      detail: `${f._count.dispatches} ${f._count.dispatches === 1 ? "Depesche" : "Depeschen"}${f.note ? ` · ${f.note}` : ""}`,
      status: f.active ? "Aktiv" : "Ruht",
      href: "/admin/aufklaerung",
    }));
  });
}

function searchMedia(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const [assets, docs] = await Promise.all([
      db.mediaAsset.findMany({
        where: { OR: [{ altDe: { contains: q } }, { altEn: { contains: q } }, { credit: { contains: q } }] },
        orderBy: { createdAt: "desc" },
        take: PER_ENTITY,
      }),
      db.mediaDocument.findMany({
        where: { OR: [{ fileName: { contains: q } }, { title: { contains: q } }] },
        orderBy: { createdAt: "desc" },
        take: PER_ENTITY,
      }),
    ]);
    const hits: SearchHit[] = assets
      .filter((a) => matchesAny(q, [a.altDe, a.altEn, a.credit]))
      .map((a) => ({
        entity: "media" as const,
        id: a.id,
        title: a.altDe || "(ohne Alt-Text)",
        detail: `Bild · ${a.width}×${a.height}`,
        status: "",
        href: "/admin/medien?tab=bilder",
        preview: {
          kind: "image" as const,
          url: assetUrl(a.blobPath),
          alt: a.altDe || "Bild",
          ai: a.source === "AI",
          label: "",
        },
      }));

    for (const d of docs) {
      const file = previewForFile(d.fileName);
      hits.push({
        entity: "media",
        id: d.id,
        title: d.title || d.fileName,
        detail: `${file.kind === "pdf" ? "PDF" : "Präsentation"} · ${d.fileName}`,
        status: "",
        href: "/admin/medien?tab=praesentationen",
        preview: { ...file, url: null, alt: d.fileName, ai: false },
      });
    }
    return hits;
  });
}

/**
 * Die Foliensätze der Briefings (PowerPoint, je Sprache einer). Sie liegen
 * nicht in der Medienverwaltung, sondern am Briefing — gesucht wurden sie
 * bisher gar nicht, obwohl „wo war noch mal das Deck zu X?" genau die Frage
 * ist, für die es eine Suche gibt.
 */
function searchSlideDecks(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.talkSlideDeck.findMany({
      where: {
        OR: [
          { fileName: { contains: q } },
          { talk: { translations: { some: { title: { contains: q } } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: PER_ENTITY,
      include: { talk: { include: { translations: true } } },
    });
    return rows.map((deck) => {
      const title =
        deck.talk.translations.find((t) => t.locale === "de")?.title ??
        deck.talk.translations[0]?.title ??
        "(ohne Titel)";
      const file = previewForFile(deck.fileName);
      return {
        entity: "media" as const,
        id: deck.id,
        title: deck.fileName,
        detail: `Foliensatz · ${title} · ${deck.locale.toUpperCase()}`,
        status: "",
        href: `/admin/briefings/bearbeiten?id=${deck.talkId}`,
        preview: { ...file, url: null, alt: deck.fileName, ai: false },
      };
    });
  });
}

/**
 * Das Material an den Briefings: Anleitungen, Notizen, Demo-Dateien, Videos.
 * Gesucht wird über Titel, Notiz und Dateiname — und über den Titel des
 * Briefings, denn gefragt wird meist „wo lag noch mal die Demo zu X?".
 */
function searchTalkAttachments(q: string): Promise<SearchHit[]> {
  return safe(async () => {
    const rows = await db.talkAttachment.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { note: { contains: q } },
          { fileName: { contains: q } },
          { talk: { translations: { some: { title: { contains: q } } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: PER_ENTITY,
      include: { talk: { include: { translations: true } } },
    });
    return rows.map((a) => {
      const talkTitle =
        a.talk.translations.find((t) => t.locale === "de")?.title ??
        a.talk.translations[0]?.title ??
        "(ohne Titel)";
      const file = previewForAttachment(a.fileName, a.mime);
      return {
        entity: "media" as const,
        id: a.id,
        title: a.title || a.fileName,
        detail: `${ATTACHMENT_KIND_LABEL[toAttachmentKind(a.kind)]} · ${talkTitle}`,
        status: "",
        href: `/admin/briefings/bearbeiten?id=${a.talkId}`,
        preview: {
          ...file,
          // Bilder kommen über die Download-Route mit Rollenprüfung, nicht über
          // den öffentlichen Medien-Proxy — das Material ist interne Ablage.
          url: file.kind === "image" ? `/api/admin/briefings/files/${a.id}?inline=1` : null,
          alt: a.title || a.fileName,
          ai: false,
        },
      };
    });
  });
}
