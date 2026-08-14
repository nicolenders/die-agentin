import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import MissionForm, { type MissionFormInitial, EMPTY_MATERIAL } from "@/components/admin/MissionForm";

export const metadata = { title: "Einsatz bearbeiten · Zentrale" };

/** JSON [{name,url}] → „Name | url"-Zeilen für das Textfeld. */
function coSpeakersToText(json: string | null): string {
  if (!json) return "";
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return "";
    return parsed
      .map((c) => (c?.url ? `${c.name} | ${c.url}` : String(c?.name ?? "")))
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export default async function EinsatzBearbeitenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let existingPins: { lat: number; lon: number }[] = [];
  let talks: { id: string; name: string; toolIds: string[] }[] = [];
  let categories: { id: string; name: string }[] = [];
  let allTools: { id: string; name: string }[] = [];
  let initial: MissionFormInitial = {
    eventName: "",
    city: "",
    countryCode: "AT",
    lat: 48.21,
    lon: 16.37,
    isOnline: false,
    startDate: "",
    endDate: "",
    status: "PLANNED",
    eventUrl: "",
    talkId: "",
    language: "de",
    de: { eventText: "", talkText: "" },
    en: null,
    photos: [],
    banner: null,
    toolIds: [],
    material: EMPTY_MATERIAL,
  };

  try {
    const [missions, talkRows, catRows, toolRows] = await Promise.all([
      db.mission.findMany({ select: { lat: true, lon: true } }),
      db.talk.findMany({ include: { translations: { where: { locale: "de" } }, tools: { select: { id: true } } } }),
      db.taxonomy.findMany({ where: { kind: "TALK" }, orderBy: { sortOrder: "asc" }, select: { id: true, nameDe: true } }),
      db.tool.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    ]);
    existingPins = missions;
    talks = talkRows.map((t) => ({ id: t.id, name: t.translations[0]?.title ?? t.id, toolIds: t.tools.map((x) => x.id) }));
    categories = catRows.map((c) => ({ id: c.id, name: c.nameDe }));
    allTools = toolRows.map((t) => ({ id: t.id, name: t.name }));

    if (id) {
      const mission = await db.mission.findUnique({
        where: { id },
        include: {
          translations: true,
          photos: { include: { asset: true }, orderBy: { sortOrder: "asc" } },
          deliveries: { take: 1, orderBy: { heldOn: "desc" } },
          banner: true,
          tools: { select: { id: true } },
        },
      });
      if (mission) {
        const de = mission.translations.find((t) => t.locale === "de");
        const en = mission.translations.find((t) => t.locale === "en");
        const delivery = mission.deliveries[0];
        initial = {
          missionId: mission.id,
          eventName: mission.eventName,
          city: mission.city,
          countryCode: mission.countryCode,
          lat: mission.lat,
          lon: mission.lon,
          isOnline: mission.isOnline,
          startDate: mission.startDate.toISOString().slice(0, 10),
          endDate: mission.endDate ? mission.endDate.toISOString().slice(0, 10) : "",
          status: mission.status,
          eventUrl: mission.eventUrl ?? "",
          talkId: delivery?.talkId ?? "",
          language: delivery?.language ?? "de",
          de: { eventText: de?.eventText ?? "", talkText: de?.talkText ?? "" },
          en: en ? { eventText: en.eventText, talkText: en.talkText } : null,
          photos: mission.photos.map((p) => ({ id: p.assetId, url: assetUrl(p.asset.blobPath) })),
          banner: mission.banner ? { id: mission.banner.id, url: assetUrl(mission.banner.blobPath) } : null,
          toolIds: mission.tools.map((t) => t.id),
          material: {
            slidesUrl: mission.slidesUrl ?? "",
            slidesPlatform: mission.slidesPlatform ?? "",
            slidesFilePath: mission.slidesFilePath ?? "",
            slidesFileName: mission.slidesFileName ?? "",
            recordingUrl: mission.recordingUrl ?? "",
            sessionType: mission.sessionType ?? "",
            sessionLanguage: mission.sessionLanguage ?? "",
            attendeeCount: mission.attendeeCount != null ? String(mission.attendeeCount) : "",
            feedbackScore: mission.feedbackScore != null ? String(mission.feedbackScore) : "",
            feedbackSource: mission.feedbackSource ?? "",
            coSpeakers: coSpeakersToText(mission.coSpeakers),
          },
        };
      }
    }
  } catch {
    // DB nicht erreichbar → leeres Formular
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link className="btn ghost sm" href="/admin/einsaetze">← Zurück zur Liste</Link>
      </div>
      <MissionForm initial={initial} existingPins={existingPins} talks={talks} categories={categories} allTools={allTools} isEdit={Boolean(id)} />
    </>
  );
}
