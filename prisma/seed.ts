/**
 * Seed mit erfundenen Beispieldaten (SPEC M1). Alle Personen-, Orts- und
 * Ereignisdaten sind Platzhalter aus den Mockups und bleiben es (keine echten
 * Personendaten oder Fotos).
 *
 * Ausführen gegen eine laufende DB:  npm run db:seed
 * Re-runnable: löscht zuerst alle Tabellen und legt neu an.
 */
import { PrismaClient } from "@prisma/client";
import type { Locale } from "../lib/i18n/config";

const db = new PrismaClient();

/** Baut ein minimales, gültiges TipTap-Dokument aus Blöcken. */
function doc(...blocks: Array<{ h?: string; p?: string }>): string {
  const content = blocks.map((b) =>
    b.h
      ? { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: b.h }] }
      : { type: "paragraph", content: [{ type: "text", text: b.p ?? "" }] },
  );
  return JSON.stringify({ type: "doc", content });
}

async function reset() {
  // Reihenfolge beachtet Fremdschlüssel.
  // Identitäten zuerst (referenzieren MediaAsset mit NoAction; Join-Tabellen
  // und Attribute hängen per Cascade an der Identität).
  await db.identityAttribute.deleteMany();
  await db.channelTask.deleteMany();
  await db.dispatchTranslation.deleteMany();
  await db.dispatch.deleteMany();
  await db.identity.deleteMany();
  await db.tool.deleteMany();
  await db.postTag.deleteMany();
  await db.postTranslation.deleteMany();
  await db.post.deleteMany();
  await db.talkDelivery.deleteMany();
  await db.talkTranslation.deleteMany();
  await db.talk.deleteMany();
  await db.missionPhoto.deleteMany();
  await db.missionTranslation.deleteMany();
  await db.mission.deleteMany();
  await db.publicationTranslation.deleteMany();
  await db.publication.deleteMany();
  await db.certification.deleteMany();
  await db.tag.deleteMany();
  await db.dossierTranslation.deleteMany();
  await db.dossier.deleteMany();
  await db.taxonomy.deleteMany();
  await db.channelAccount.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.redirect.deleteMany();
  await db.auditLog.deleteMany();
}

async function main() {
  await reset();

  // --- Taxonomien -----------------------------------------------------------
  const dossierCats = [
    { id: "tax-do-copilot", nameDe: "Copilot Studio", nameEn: "Copilot Studio", slug: "copilot-studio" },
    { id: "tax-do-foundry", nameDe: "Microsoft Foundry", nameEn: "Microsoft Foundry", slug: "foundry" },
    { id: "tax-do-purview", nameDe: "Purview", nameEn: "Purview", slug: "purview" },
    { id: "tax-do-power", nameDe: "Power Platform", nameEn: "Power Platform", slug: "power-platform" },
    { id: "tax-do-dev", nameDe: "Development", nameEn: "Development", slug: "development" },
  ];
  const talkCats = [
    { id: "tax-tk-copilot", nameDe: "Copilot & Agents", nameEn: "Copilot & Agents", slug: "copilot-agents" },
    { id: "tax-tk-security", nameDe: "Security & Compliance", nameEn: "Security & Compliance", slug: "security-compliance" },
    { id: "tax-tk-modern", nameDe: "Modern Work", nameEn: "Modern Work", slug: "modern-work" },
    { id: "tax-tk-dev", nameDe: "Development", nameEn: "Development", slug: "development" },
  ];
  const certCats = [
    { id: "tax-ce-awards", nameDe: "Auszeichnungen", nameEn: "Awards", slug: "auszeichnungen" },
    { id: "tax-ce-azure", nameDe: "Microsoft Azure & KI", nameEn: "Microsoft Azure & AI", slug: "azure-ki" },
    { id: "tax-ce-modern", nameDe: "Modern Work & Security", nameEn: "Modern Work & Security", slug: "modern-work-security" },
    { id: "tax-ce-power", nameDe: "Power Platform", nameEn: "Power Platform", slug: "power-platform" },
  ];
  await db.taxonomy.createMany({
    data: [
      ...dossierCats.map((c, i) => ({ ...c, kind: "DOSSIER", sortOrder: i })),
      ...talkCats.map((c, i) => ({ ...c, kind: "TALK", sortOrder: i })),
      ...certCats.map((c, i) => ({ ...c, kind: "CERTIFICATION", sortOrder: i })),
    ],
  });

  // --- Tags -----------------------------------------------------------------
  await db.tag.createMany({
    data: [
      { id: "tag-microsoft", nameDe: "Microsoft", nameEn: "Microsoft", slug: "microsoft" },
      { id: "tag-ki", nameDe: "KI", nameEn: "AI", slug: "ki" },
      { id: "tag-dev", nameDe: "Software Development", nameEn: "Software Development", slug: "software-development" },
      { id: "tag-purview", nameDe: "Purview", nameEn: "Purview", slug: "purview" },
    ],
  });

  // --- Talks (Briefings) ----------------------------------------------------
  const talks = [
    {
      id: "talk-extensibility",
      categoryId: "tax-tk-copilot",
      level: "300",
      durationMin: 60,
      de: { title: "Copilot Extensibility in der Praxis", abstract: "Declarative Agents, API-Plugins und die Frage, wann sich Eigenbau lohnt." },
      en: { title: "Copilot Extensibility in Practice", abstract: "Declarative agents, API plugins and when building your own pays off." },
      deliveries: { de: 5, en: 4 },
    },
    {
      id: "talk-assistant",
      categoryId: "tax-tk-copilot",
      level: "300",
      durationMin: 45,
      de: { title: "Bauen wir einen AI Assistant für den Kundenservice", abstract: "Copilot Studio trifft Microsoft Foundry — mit Live-Demo." },
      en: { title: "Let's build an AI assistant for customer service", abstract: "Copilot Studio meets Microsoft Foundry — with a live demo." },
      deliveries: { de: 5, en: 1 },
    },
    {
      id: "talk-labels",
      categoryId: "tax-tk-security",
      level: "200",
      durationMin: 480,
      de: { title: "Sensitivity Labels: Ganztages-Workshop", abstract: "Purview Information Protection von der Taxonomie bis zum Rollout, hands-on." },
      en: { title: "Sensitivity Labels: full-day workshop", abstract: "Purview Information Protection from taxonomy to rollout, hands-on." },
      deliveries: { de: 4, en: 0 },
    },
    {
      id: "talk-pptx",
      categoryId: "tax-tk-modern",
      level: "100",
      durationMin: 30,
      de: { title: "Copilot-ready PowerPoint", abstract: "Wie Folien aufgebaut sein müssen, damit Copilot sie verwerten kann." },
      en: { title: "Copilot-ready PowerPoint", abstract: "How slides must be structured so Copilot can make sense of them." },
      deliveries: { de: 3, en: 0 },
    },
  ];

  for (const t of talks) {
    await db.talk.create({
      data: {
        id: t.id,
        categoryId: t.categoryId,
        categories: { connect: [{ id: t.categoryId }] },
        level: t.level,
        durationMin: t.durationMin,
        active: true,
        translations: {
          create: [
            { locale: "de", title: t.de.title, abstract: t.de.abstract },
            { locale: "en", title: t.en.title, abstract: t.en.abstract },
          ],
        },
      },
    });
  }

  // --- Missionen (Einsätze) -------------------------------------------------
  const missions = [
    { id: "m-linz", eventName: "Experts Live Austria", city: "Linz", countryCode: "AT", lat: 48.31, lon: 14.29, start: "2026-06-02", status: "DONE", url: "https://example.org/experts-live" },
    { id: "m-salzburg", eventName: "Infinity 365", city: "Salzburg", countryCode: "AT", lat: 47.81, lon: 13.04, start: "2026-06-04", status: "DONE", url: "https://example.org/infinity365" },
    { id: "m-wien", eventName: "Cloud Summit Austria", city: "Wien", countryCode: "AT", lat: 48.21, lon: 16.37, start: "2026-09-12", status: "PLANNED", url: "https://example.org/cloud-summit" },
    { id: "m-amsterdam", eventName: "ESPC", city: "Amsterdam", countryCode: "NL", lat: 52.37, lon: 4.9, start: "2026-01-28", status: "DONE", url: null },
    { id: "m-koeln", eventName: "M365 Community Day", city: "Köln", countryCode: "DE", lat: 50.94, lon: 6.96, start: "2025-11-14", status: "DONE", url: null },
    { id: "m-zuerich", eventName: "Experts Live Switzerland", city: "Zürich", countryCode: "CH", lat: 47.38, lon: 8.54, start: "2025-09-11", status: "DONE", url: null },
    { id: "m-redmond", eventName: "MVP Summit", city: "Redmond", countryCode: "US", lat: 47.67, lon: -122.12, start: "2026-03-19", status: "DONE", url: null },
    { id: "m-sydney", eventName: "Difinity", city: "Sydney", countryCode: "AU", lat: -33.87, lon: 151.21, start: "2025-03-14", status: "DONE", url: null },
  ];
  for (const m of missions) {
    await db.mission.create({
      data: {
        id: m.id,
        eventName: m.eventName,
        city: m.city,
        countryCode: m.countryCode,
        lat: m.lat,
        lon: m.lon,
        startDate: new Date(`${m.start}T00:00:00Z`),
        status: m.status,
        contentStatus: m.status === "PLANNED" ? "DRAFT" : "PUBLISHED",
        eventUrl: m.url,
      },
    });
  }

  // Einsatzakte Linz (DE + EN) als Beispiel mit zwei Textbereichen.
  await db.missionTranslation.createMany({
    data: [
      {
        missionId: "m-linz",
        locale: "de",
        slug: "experts-live-austria-linz",
        eventText: "Experts Live Austria bringt einmal im Jahr die österreichische Microsoft-Community in Linz zusammen. Rund 400 Teilnehmende, acht parallele Tracks.",
        talkText: "Kombination aus einem Copilot-Studio-Chatbot und einem Teams-Assistenten auf Basis von Microsoft Foundry. Live-Demo mit echtem Ticket-Backend.",
        state: "REVIEWED",
      },
      {
        missionId: "m-linz",
        locale: "en",
        slug: "experts-live-austria-linz-en",
        eventText: "Experts Live Austria brings the Austrian Microsoft community together in Linz once a year. Around 400 attendees, eight parallel tracks.",
        talkText: "A Copilot Studio chatbot combined with a Teams assistant on Microsoft Foundry. Live demo with a real ticket backend.",
        state: "REVIEWED",
      },
      {
        missionId: "m-wien",
        locale: "de",
        slug: "cloud-summit-austria-wien",
        eventText: "Cloud Summit Austria in Wien — die Anlaufstelle für Cloud- und KI-Themen im DACH-Raum.",
        talkText: "Agents, die tatsächlich in Produktion gehen: Copilot Studio trifft Microsoft Foundry.",
        state: "REVIEWED",
      },
    ],
  });

  // --- TalkDeliveries: erzeugen die Ranking-Zahlen (SPEC M6) ----------------
  const missionIds = missions.map((m) => m.id);
  let deliveryDate = new Date("2024-02-01T00:00:00Z");
  function nextDate(): Date {
    deliveryDate = new Date(deliveryDate.getTime() + 21 * 24 * 3600 * 1000);
    return deliveryDate;
  }
  for (const t of talks) {
    const plan: Array<{ language: Locale; count: number }> = [
      { language: "de", count: t.deliveries.de },
      { language: "en", count: t.deliveries.en },
    ];
    for (const { language, count } of plan) {
      for (let i = 0; i < count; i++) {
        await db.talkDelivery.create({
          data: {
            talkId: t.id,
            missionId: missionIds[i % missionIds.length]!,
            language,
            heldOn: nextDate(),
          },
        });
      }
    }
  }

  // --- Beiträge (Signale, Kurzmeldungen, Backstage) -------------------------
  const posts = [
    {
      id: "post-tracing",
      type: "SIGNAL",
      status: "PUBLISHED",
      publishedAt: "2026-07-28T14:20:00Z",
      sourceUrl: "https://techcommunity.microsoft.com/example-tracing",
      sourceTitle: "Tracing for agents in Microsoft Foundry",
      sourceSite: "techcommunity.microsoft.com",
      de: { slug: "foundry-agent-tracing", title: "Microsoft Foundry bekommt Agent-Tracing", summary: "Warum das für Produktions-Agents mehr verändert als das Feature-Listing vermuten lässt." },
      en: { slug: "foundry-agent-tracing-en", title: "Microsoft Foundry gets agent tracing", summary: "Why this changes more for production agents than the feature listing suggests." },
      tags: ["tag-microsoft", "tag-ki"],
    },
    {
      id: "post-labels",
      type: "NOTE",
      status: "PUBLISHED",
      publishedAt: "2026-07-26T08:05:00Z",
      de: { slug: "sensitivity-labels-auto-labeling-grenzen", title: "Sensitivity Labels: Neue Grenzen beim Auto-Labeling", summary: "Was sich in Purview zum 1. August ändert — und was du vorher prüfen solltest." },
      en: { slug: "sensitivity-labels-auto-labeling-limits", title: "Sensitivity Labels: new auto-labeling limits", summary: "What changes in Purview on August 1 — and what to check beforehand." },
      tags: ["tag-microsoft", "tag-purview"],
    },
    {
      id: "post-backstage-wien",
      type: "BACKSTAGE",
      status: "PUBLISHED",
      publishedAt: "2026-07-21T19:40:00Z",
      de: { slug: "vorbereitung-einsatz-wien", title: "Vorbereitung Einsatz Wien: 3 Demos, 1 Tenant", summary: "Wie ich Demo-Umgebungen baue, die auch ohne WLAN überleben." },
      en: null,
      tags: [],
    },
    {
      id: "post-mvp",
      type: "BACKSTAGE",
      status: "PUBLISHED",
      publishedAt: "2026-07-14T11:15:00Z",
      de: { slug: "mvp-siebtes-mal", title: "Ziel erreicht: MVP Award zum siebten Mal", summary: "Sieben Jahre in Folge — und der Grund ist jedes Mal die Community." },
      en: null,
      tags: [],
    },
  ] as const;

  for (const p of posts) {
    await db.post.create({
      data: {
        id: p.id,
        type: p.type,
        status: p.status,
        publishedAt: new Date(p.publishedAt),
        publishAt: new Date(p.publishedAt),
        sourceUrl: "sourceUrl" in p ? p.sourceUrl : null,
        sourceTitle: "sourceTitle" in p ? p.sourceTitle : null,
        sourceSite: "sourceSite" in p ? p.sourceSite : null,
        translations: {
          create: [
            {
              locale: "de",
              slug: p.de.slug,
              title: p.de.title,
              summary: p.de.summary,
              bodyJson: doc({ p: p.de.summary }, { h: "Einordnung" }, { p: "Meine Einordnung folgt im Editor (M2)." }),
              state: "REVIEWED",
            },
            ...(p.en
              ? [
                  {
                    locale: "en",
                    slug: p.en.slug,
                    title: p.en.title,
                    summary: p.en.summary,
                    bodyJson: doc({ p: p.en.summary }),
                    state: "REVIEWED",
                  },
                ]
              : []),
          ],
        },
        tags: { create: p.tags.map((tagId) => ({ tagId })) },
      },
    });
  }

  // --- Dossier (DE + EN) ----------------------------------------------------
  await db.dossier.create({
    data: {
      id: "dossier-labels",
      status: "PUBLISHED",
      categoryId: "tax-do-purview",
      categories: { connect: [{ id: "tax-do-purview" }] },
      reviewedAt: new Date("2026-07-12T00:00:00Z"),
      publishAt: new Date("2026-02-04T00:00:00Z"),
      translations: {
        create: [
          {
            locale: "de",
            slug: "sensitivity-labels-sauber-ausrollen",
            title: "Sensitivity Labels sauber ausrollen",
            summary: "Von der Label-Taxonomie bis zum Rollout in vier Wellen.",
            bodyJson: doc({ p: "Ein Label-Rollout scheitert selten an der Technik." }, { h: "Taxonomie festlegen" }, { p: "Am Anfang steht keine Policy, sondern ein Gespräch." }),
            tocEnabled: true,
            state: "REVIEWED",
          },
          {
            locale: "en",
            slug: "rolling-out-sensitivity-labels",
            title: "Rolling out Sensitivity Labels cleanly",
            summary: "From label taxonomy to a four-wave rollout.",
            bodyJson: doc({ p: "A label rollout rarely fails on technology." }),
            tocEnabled: true,
            state: "REVIEWED",
          },
        ],
      },
    },
  });

  // --- Publikationen --------------------------------------------------------
  await db.publication.create({
    data: {
      id: "pub-copilot-buch",
      type: "BOOK",
      year: 2025,
      isbn: "978-3-000000-00-0",
      publisher: "Beispielverlag",
      url: "https://example.org/buch-copilot",
      sortOrder: 0,
      translations: { create: [{ locale: "de", title: "Microsoft 365 Copilot in der Praxis", role: "Co-Autorin" }, { locale: "en", title: "Microsoft 365 Copilot in Practice", role: "Co-author" }] },
    },
  });
  await db.publication.create({
    data: {
      id: "pub-governance-buch",
      type: "BOOK",
      year: 2026,
      isbn: "978-3-000000-01-7",
      publisher: "Beispielverlag",
      url: "https://example.org/buch-governance",
      sortOrder: 1,
      translations: { create: [{ locale: "de", title: "Governance für KI-Agents", role: "Autorin" }, { locale: "en", title: "Governance for AI agents", role: "Author" }] },
    },
  });
  await db.publication.create({
    data: {
      id: "pub-artikel",
      type: "ARTICLE",
      year: 2026,
      publisher: "Fachmagazin",
      sortOrder: 2,
      translations: { create: [{ locale: "de", title: "Agents in Produktion bringen" }] },
    },
  });

  // --- Zertifizierungen / Auszeichnungen ------------------------------------
  // Einzeln (statt createMany), damit die Mehrfach-Kategorie mitverknüpft wird.
  const certs = [
    { name: "Microsoft MVP — M365 Apps & Services", categoryId: "tax-ce-awards", acquiredOn: new Date("2020-07-01T00:00:00Z"), series: "MVP", sortOrder: 0 },
    { name: "Azure AI Engineer Associate", shortCode: "AI-102", categoryId: "tax-ce-azure", acquiredOn: new Date("2025-03-01T00:00:00Z"), sortOrder: 0 },
    { name: "Azure Administrator Associate", shortCode: "AZ-104", categoryId: "tax-ce-azure", acquiredOn: new Date("2023-11-01T00:00:00Z"), validUntil: new Date("2027-10-01T00:00:00Z"), sortOrder: 1 },
    { name: "Microsoft 365 Administrator Expert", shortCode: "MS-102", categoryId: "tax-ce-modern", acquiredOn: new Date("2024-06-01T00:00:00Z"), sortOrder: 0 },
    { name: "Information Protection Administrator", shortCode: "SC-400", categoryId: "tax-ce-modern", acquiredOn: new Date("2024-02-01T00:00:00Z"), sortOrder: 1 },
    { name: "Power Platform Solution Architect Expert", shortCode: "PL-600", categoryId: "tax-ce-power", acquiredOn: new Date("2023-09-01T00:00:00Z"), sortOrder: 0 },
    // In Ausbildung (Phase 5.3): geplant, ohne Erwerbsdatum-Anzeige.
    { name: "Designing and Implementing a Microsoft Azure AI Solution (Renewal)", shortCode: "AI-102", categoryId: "tax-ce-azure", acquiredOn: new Date("2026-08-01T00:00:00Z"), status: "PLANNED", plannedFor: "Q4 2026", sortOrder: 2 },
  ];
  for (const c of certs) {
    const { categoryId, ...rest } = c;
    await db.certification.create({
      data: { ...rest, categoryId, categories: { connect: [{ id: categoryId }] } },
    });
  }

  // --- Identitäten (Decknamen) — Phase 2.5 ----------------------------------
  // published=false, Beschreibungen als markierte ENTWÜRFE. Die Decknamen
  // (codenameDe/En) bleiben LEER — STOP, Nicole füllt sie (Anhang B). Bis dahin
  // fällt die Anzeige auf die Rolle zurück. Keine Chronologie, kein Enddatum.
  const identities = [
    {
      slug: "collaboration",
      roleDe: "Collaboration & Modern Work",
      roleEn: "Collaboration & Modern Work",
      color: "#8B5CF6",
      registryCode: "ID-01",
      focus: ["SharePoint", "Microsoft Teams", "Microsoft 365"],
      descDe: "ENTWURF — von Nicole zu prüfen. Zusammenarbeit in Unternehmen: Informationsarchitektur in SharePoint, Modern Work mit Microsoft Teams und Microsoft 365. Die Grundlage, auf der später Copilot-Qualität steht.",
      descEn: "ENTWURF — von Nicole zu prüfen. Collaboration in organisations: information architecture in SharePoint, modern work with Microsoft Teams and Microsoft 365 — the foundation that later Copilot quality sits on.",
    },
    {
      slug: "low-code",
      roleDe: "Power Platform & Business Applications",
      roleEn: "Power Platform & Business Applications",
      color: "#E879F9",
      registryCode: "ID-02",
      focus: ["Power Platform", "Dataverse", "Business Applications"],
      descDe: "ENTWURF — von Nicole zu prüfen. Low Code auf der Power Platform, wo die Grenze zwischen Konfiguration und Code verhandelbar wird: Dataverse, Business Applications, Custom Connectors.",
      descEn: "ENTWURF — von Nicole zu prüfen. Low code on the Power Platform, where the line between configuration and code becomes negotiable: Dataverse, business applications, custom connectors.",
    },
    {
      slug: "agentic-ai",
      roleDe: "Microsoft AI & Agents",
      roleEn: "Microsoft AI & Agents",
      color: "#38BDF8",
      registryCode: "ID-03",
      focus: ["Copilot", "Copilot Studio", "Microsoft Foundry", "Agentic AI"],
      descDe: "ENTWURF — von Nicole zu prüfen. Agents mit Microsoft 365 Copilot, Copilot Studio und Microsoft Foundry — auf denselben Fundamenten aus Information Architecture und Governance, die seit Jahren tragen.",
      descEn: "ENTWURF — von Nicole zu prüfen. Agents built with Microsoft 365 Copilot, Copilot Studio and Microsoft Foundry — on the same foundations of information architecture and governance that have held for years.",
    },
    {
      slug: "dev-ai",
      roleDe: "KI in der Softwareentwicklung",
      roleEn: "AI in Software Development",
      color: "#4ADE80",
      registryCode: "ID-04",
      focus: ["herstellerübergreifend", "Tooling", "Engineering-Praxis"],
      descDe: "ENTWURF — von Nicole zu prüfen. KI in der Softwareentwicklung, bewusst herstellerübergreifend und nicht auf ein Ökosystem festgelegt: Tooling, Engineering-Praxis, die Frage, wo KI im Entwicklungsalltag wirklich trägt.",
      descEn: "ENTWURF — von Nicole zu prüfen. AI in software development, deliberately vendor-neutral and not tied to one ecosystem: tooling, engineering practice, and where AI actually holds up in day-to-day development.",
    },
  ];
  const identityIds: Record<string, string> = {};
  for (const [i, id] of identities.entries()) {
    const created = await db.identity.create({
      data: {
        slug: id.slug,
        roleDe: id.roleDe,
        roleEn: id.roleEn,
        color: id.color,
        registryCode: id.registryCode,
        sortOrder: i,
        isPrimary: i === 0,
        // Seed-Identitäten sind veröffentlicht, damit die öffentlichen Seiten
        // (Depeschen-Zuordnung, Identitäts-Übersicht) Daten haben. In Produktion
        // legt der Import sie als Entwurf an; Nicole veröffentlicht nach Prüfung.
        published: true,
        focusDe: JSON.stringify(id.focus),
        focusEn: JSON.stringify(id.focus),
        languages: JSON.stringify(["Deutsch", "English"]),
        descriptionDe: doc({ p: id.descDe }),
        descriptionEn: doc({ p: id.descEn }),
      },
    });
    identityIds[id.slug] = created.id;
  }

  // --- Depeschen (Phase 3) --------------------------------------------------
  // Aus den früheren Signalen/Dossiers zusammengeführt; Format aus dem alten Typ
  // abgeleitet (SIGNAL→ANALYSIS, NOTE→NOTE, BACKSTAGE→BACKSTAGE, Dossier→REFERENCE),
  // je an eine Identität gebunden.
  const dispatches = [
    {
      format: "ANALYSIS", identity: "agentic-ai", topic: "tax-do-foundry",
      publishedAt: "2026-07-28T14:20:00Z",
      sourceUrl: "https://techcommunity.microsoft.com/example-tracing",
      sourceTitle: "Tracing for agents in Microsoft Foundry", sourceSite: "techcommunity.microsoft.com",
      de: { slug: "foundry-agent-tracing", title: "Microsoft Foundry bekommt Agent-Tracing", summary: "Warum das für Produktions-Agents mehr verändert als das Feature-Listing vermuten lässt." },
      en: { slug: "foundry-agent-tracing-en", title: "Microsoft Foundry gets agent tracing", summary: "Why this changes more for production agents than the feature listing suggests." },
    },
    {
      format: "NOTE", identity: "collaboration", topic: "tax-do-purview",
      publishedAt: "2026-07-26T08:05:00Z",
      de: { slug: "sensitivity-labels-auto-labeling-grenzen", title: "Sensitivity Labels: Neue Grenzen beim Auto-Labeling", summary: "Was sich in Purview zum 1. August ändert — und was du vorher prüfen solltest." },
      en: { slug: "sensitivity-labels-auto-labeling-limits", title: "Sensitivity Labels: new auto-labeling limits", summary: "What changes in Purview on August 1 — and what to check beforehand." },
    },
    {
      format: "BACKSTAGE", identity: "agentic-ai", topic: null,
      publishedAt: "2026-07-21T19:40:00Z",
      de: { slug: "vorbereitung-einsatz-wien", title: "Vorbereitung Einsatz Wien: 3 Demos, 1 Tenant", summary: "Wie ich Demo-Umgebungen baue, die auch ohne WLAN überleben." },
      en: null,
    },
    {
      format: "BACKSTAGE", identity: "collaboration", topic: null,
      publishedAt: "2026-07-14T11:15:00Z",
      de: { slug: "mvp-siebtes-mal", title: "Ziel erreicht: MVP Award zum siebten Mal", summary: "Sieben Jahre in Folge — und der Grund ist jedes Mal die Community." },
      en: null,
    },
    {
      format: "REFERENCE", identity: "collaboration", topic: "tax-do-purview",
      publishedAt: "2026-02-04T00:00:00Z", reviewedAt: "2026-07-12T00:00:00Z",
      de: { slug: "sensitivity-labels-sauber-ausrollen", title: "Sensitivity Labels sauber ausrollen", summary: "Von der Label-Taxonomie bis zum Rollout in vier Wellen." },
      en: { slug: "rolling-out-sensitivity-labels", title: "Rolling out Sensitivity Labels cleanly", summary: "From label taxonomy to a four-wave rollout." },
    },
  ] as const;

  for (const d of dispatches) {
    await db.dispatch.create({
      data: {
        format: d.format,
        status: "PUBLISHED",
        publishedAt: new Date(d.publishedAt),
        publishAt: new Date(d.publishedAt),
        reviewedAt: "reviewedAt" in d && d.reviewedAt ? new Date(d.reviewedAt) : null,
        sourceUrl: "sourceUrl" in d ? d.sourceUrl : null,
        sourceTitle: "sourceTitle" in d ? d.sourceTitle : null,
        sourceSite: "sourceSite" in d ? d.sourceSite : null,
        identities: { connect: [{ id: identityIds[d.identity]! }] },
        topics: d.topic ? { connect: [{ id: d.topic }] } : undefined,
        translations: {
          create: [
            { locale: "de", slug: d.de.slug, title: d.de.title, summary: d.de.summary, tocEnabled: d.format === "REFERENCE", bodyJson: doc({ p: d.de.summary }, { h: "Einordnung" }, { p: "Der volle Text folgt im Editor." }), state: "REVIEWED" },
            ...(d.en ? [{ locale: "en", slug: d.en.slug, title: d.en.title, summary: d.en.summary, tocEnabled: d.format === "REFERENCE", bodyJson: doc({ p: d.en.summary }), state: "REVIEWED" }] : []),
          ],
        },
      },
    });
  }

  // --- Kanäle ---------------------------------------------------------------
  await db.channelAccount.createMany({
    data: [
      { platform: "LINKEDIN", displayName: "Persönliches Profil", connected: true, expiresAt: new Date("2026-08-09T00:00:00Z") },
      { platform: "X", displayName: "@dieagentin", connected: false, lastError: "Token abgelaufen" },
      { platform: "INSTAGRAM", displayName: "Creator-Konto", connected: true },
      { platform: "FACEBOOK", displayName: "Seite „Die Agentin\"", connected: true },
      { platform: "YOUTUBE", displayName: "Die Agentin", connected: false },
    ],
  });

  // --- Rechtstexte (Phase 11) -----------------------------------------------
  // Vollständige, verwendbare Fassungen DE + EN. KEINE Rechtsberatung — vor dem
  // Cutover fachkundig prüfen lassen (docs/PROGRESS.md). Die Pflichtangaben
  // (Name/Anschrift/E-Mail/LinkedIn) zieht die Impressum-Seite aus den
  // Einstellungen; hier stehen nur die freien Blöcke.
  const legalDocs: { docKey: string; locale: string; title: string; blocks: Array<{ h?: string; p?: string }> }[] = [
    {
      docKey: "IMPRINT", locale: "de", title: "Impressum",
      blocks: [
        { h: "Haftung für Inhalte" },
        { p: "Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entferne ich diese Inhalte umgehend." },
        { h: "Haftung für Links" },
        { p: "Mein Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar. Eine permanente inhaltliche Kontrolle ist ohne konkrete Anhaltspunkte nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen entferne ich derartige Links umgehend." },
        { h: "Urheberrecht" },
        { p: "Die von mir erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen meiner schriftlichen Zustimmung. Downloads und Kopien sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit Inhalte nicht von mir erstellt wurden, werden die Urheberrechte Dritter beachtet und als solche gekennzeichnet. Sollten Sie dennoch auf eine Urheberrechtsverletzung aufmerksam werden, bitte ich um einen Hinweis; bei Bekanntwerden entferne ich solche Inhalte umgehend." },
        { h: "Streitschlichtung" },
        { p: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit. Als Privatperson ohne Verbrauchergeschäft bin ich nicht zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle verpflichtet und nehme daran nicht teil." },
      ],
    },
    {
      docKey: "IMPRINT", locale: "en", title: "Imprint",
      blocks: [
        { h: "Liability for content" },
        { p: "As a service provider I am responsible for my own content on these pages under the general laws (§ 7 (1) DDG). Under §§ 8 to 10 DDG, however, I am not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate unlawful activity. Obligations to remove or block the use of information under the general laws remain unaffected. Liability in this respect is only possible from the point in time at which a concrete infringement becomes known. Upon becoming aware of such infringements, I will remove the content promptly." },
        { h: "Liability for links" },
        { p: "My offering contains links to external third-party websites over whose content I have no influence. I therefore cannot assume any liability for this third-party content. The respective provider or operator of the linked pages is always responsible for their content. The linked pages were checked for possible legal violations at the time of linking; unlawful content was not recognisable. Ongoing monitoring without concrete evidence of an infringement is not reasonable. Upon becoming aware of legal violations, I will remove such links promptly." },
        { h: "Copyright" },
        { p: "The content and works I create on these pages are subject to German copyright law. Reproduction, editing, distribution and any kind of use beyond the limits of copyright require my written consent. Downloads and copies are permitted for private, non-commercial use only. Where content was not created by me, the copyrights of third parties are respected and marked as such. Should you nonetheless notice an infringement, please let me know; I will remove such content promptly." },
        { h: "Dispute resolution" },
        { p: "The European Commission provides a platform for online dispute resolution. As a private individual without consumer business, I am neither obliged to participate in dispute resolution proceedings before a consumer arbitration board nor do I do so." },
      ],
    },
    {
      docKey: "PRIVACY", locale: "de", title: "Datenschutzerklärung",
      blocks: [
        { h: "Verantwortlicher" },
        { p: "Verantwortlich für die Datenverarbeitung auf dieser Website ist Nicole Enders. Die Kontaktdaten finden Sie im Impressum." },
        { h: "Allgemeines zur Datenverarbeitung" },
        { p: "Ich verarbeite personenbezogene Daten nur, soweit dies zur Bereitstellung einer funktionsfähigen Website und meiner Inhalte erforderlich ist. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), lit. b (Vertrag/Anbahnung) und lit. f (berechtigtes Interesse)." },
        { h: "Hosting und Server-Logfiles" },
        { p: "Diese Website wird bei Microsoft Azure (Azure Container Apps, Region West Europe) gehostet. Beim Aufruf werden automatisch Informationen in Server-Logfiles erfasst (u. a. gekürzte IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, User-Agent) auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO zum Zweck eines sicheren, stabilen Betriebs. Die Logs werden nach spätestens 30 Tagen gelöscht." },
        { h: "Cookies" },
        { p: "Für Leserinnen und Leser werden keine Cookies gesetzt. Ein technisch notwendiges Cookie wird ausschließlich für den Admin-Login (Redaktion) verwendet. Ein Einwilligungsbanner ist daher nicht erforderlich." },
        { h: "Eingebettete Inhalte Dritter" },
        { p: "Einzelne Seiten können Videos von YouTube (Google Ireland Ltd.) einbinden. Diese werden erst nach Ihrer ausdrücklichen Zustimmung geladen (Zwei-Klick-Lösung); vorher besteht keine Verbindung zu YouTube. Die interaktive Karte wird lokal aus gebündelten Geodaten gerendert — es werden keine Kartendienste Dritter aufgerufen." },
        { h: "Kontaktaufnahme" },
        { p: "Wenn Sie mich per E-Mail oder LinkedIn kontaktieren, verarbeite ich die übermittelten Daten zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Für LinkedIn gelten zusätzlich die Datenschutzhinweise von LinkedIn." },
        { h: "RSS-Feed" },
        { p: "Der angebotene RSS-Feed enthält keine personenbezogenen Daten." },
        { h: "Ihre Rechte" },
        { p: "Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren." },
        { h: "Speicherdauer" },
        { p: "Personenbezogene Daten werden nur so lange gespeichert, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen." },
        { h: "Änderungen dieser Erklärung" },
        { p: "Diese Datenschutzerklärung wird angepasst, sobald sich die Datenverarbeitung ändert. Es gilt die jeweils hier veröffentlichte Fassung; das Stand-Datum ergibt sich aus dem letzten Änderungsdatum." },
      ],
    },
    {
      docKey: "PRIVACY", locale: "en", title: "Privacy policy",
      blocks: [
        { h: "Controller" },
        { p: "The controller for data processing on this website is Nicole Enders. Contact details are provided in the imprint." },
        { h: "General information" },
        { p: "I process personal data only to the extent necessary to provide a functional website and my content. The legal bases are in particular Art. 6 (1) (a) GDPR (consent), (b) (contract) and (f) (legitimate interest)." },
        { h: "Hosting and server log files" },
        { p: "This website is hosted on Microsoft Azure (Azure Container Apps, West Europe region). When the pages are accessed, information is automatically recorded in server log files (including a shortened IP address, date/time, page accessed, user agent) on the basis of Art. 6 (1) (f) GDPR for secure, stable operation. Logs are deleted after 30 days at the latest." },
        { h: "Cookies" },
        { p: "No cookies are set for readers. A technically necessary cookie is used solely for the admin login (editorial). A consent banner is therefore not required." },
        { h: "Embedded third-party content" },
        { p: "Individual pages may embed videos from YouTube (Google Ireland Ltd.). These are only loaded after your explicit consent (two-click solution); no connection to YouTube is made beforehand. The interactive map is rendered locally from bundled geodata — no third-party map services are called." },
        { h: "Contacting me" },
        { p: "If you contact me by email or LinkedIn, I process the data you provide to handle your request (Art. 6 (1) (b) or (f) GDPR). LinkedIn's own privacy notices additionally apply to LinkedIn." },
        { h: "RSS feed" },
        { p: "The RSS feed offered contains no personal data." },
        { h: "Your rights" },
        { p: "You have the right to access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and objection (Art. 21 GDPR), as well as the right to lodge a complaint with a data protection supervisory authority." },
        { h: "Retention period" },
        { p: "Personal data is stored only for as long as necessary for the stated purposes or as required by statutory retention periods." },
        { h: "Changes to this policy" },
        { p: "This privacy policy will be adapted as soon as the data processing changes. The version published here applies; the date reflects the last modification." },
      ],
    },
    {
      docKey: "ACCESSIBILITY", locale: "de", title: "Erklärung zur Barrierefreiheit",
      blocks: [
        { p: "Diese Erklärung ist eine freiwillige Selbstverpflichtung. Diese Website ist ein rein redaktionelles Informationsangebot einer Privatperson ohne Verkaufs- oder Buchungsfunktion und fällt daher voraussichtlich nicht unter das Barrierefreiheitsstärkungsgesetz (BFSG). Ich bemühe mich dennoch aus eigenem Anspruch um Barrierefreiheit." },
        { h: "Angestrebter Standard" },
        { p: "Ziel ist die Konformität mit den Web Content Accessibility Guidelines (WCAG) 2.1, Stufe AA." },
        { h: "Aktueller Stand und Selbsteinschätzung" },
        { p: "Die Seite ist weitgehend barrierefrei nutzbar: semantisches HTML, durchgängige Tastaturbedienung mit sichtbarem Fokus, ausreichende Farbkontraste, Alternativtexte für Bilder und Respektierung von „prefers-reduced-motion“." },
        { h: "Bekannte Einschränkungen" },
        { p: "Die interaktive Weltkarte ist für Screenreader nicht sinnvoll erschließbar. Als gleichwertige Alternative steht unter der Karte immer eine vollständige Tabelle aller Einsätze zur Verfügung." },
        { h: "Feedback und Kontakt" },
        { p: "Wenn Ihnen Barrieren auffallen, freue ich mich über einen Hinweis über die im Impressum genannte E-Mail-Adresse." },
        { h: "Datum der letzten Prüfung" },
        { p: "Diese Erklärung wird bei Änderungen aktualisiert; das Stand-Datum ergibt sich aus dem letzten Änderungsdatum." },
      ],
    },
    {
      docKey: "ACCESSIBILITY", locale: "en", title: "Accessibility statement",
      blocks: [
        { p: "This statement is a voluntary self-commitment. This website is a purely editorial information offering by a private individual, without any sales or booking function, and therefore presumably does not fall under the German Accessibility Strengthening Act (BFSG). I nevertheless strive for accessibility out of my own standards." },
        { h: "Target standard" },
        { p: "The goal is conformance with the Web Content Accessibility Guidelines (WCAG) 2.1, level AA." },
        { h: "Current state and self-assessment" },
        { p: "The site is largely accessible: semantic HTML, full keyboard operation with a visible focus, sufficient colour contrast, alternative texts for images and respect for 'prefers-reduced-motion'." },
        { h: "Known limitations" },
        { p: "The interactive world map cannot be meaningfully accessed by screen readers. As an equivalent alternative, a complete table of all missions is always available below the map." },
        { h: "Feedback and contact" },
        { p: "If you notice any barriers, I welcome a note to the email address given in the imprint." },
        { h: "Date of last review" },
        { p: "This statement is updated when changes occur; the date reflects the last modification." },
      ],
    },
  ];
  for (const d of legalDocs) {
    await db.legalDoc.upsert({
      where: { docKey_locale: { docKey: d.docKey, locale: d.locale } },
      create: { docKey: d.docKey, locale: d.locale, title: d.title, body: doc(...d.blocks) },
      update: { title: d.title, body: doc(...d.blocks) },
    });
  }

  console.log("Seed abgeschlossen.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
