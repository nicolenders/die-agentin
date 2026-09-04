"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeGeo, project } from "@/lib/map/geo";
import { MISSION_STATUSES, SESSION_TYPES } from "@/lib/domain";
import { withParams } from "@/lib/admin/return-to";
import MediaPicker, { type MediaItem } from "@/components/admin/editor/MediaPicker";
import RichTextField from "@/components/admin/editor/RichTextField";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import { assetUrl } from "@/lib/media/url";
import { showToast } from "@/lib/admin/toast";
import { formatMb, pickForLanguage } from "@/lib/slide-templates";
import { deckUrl, type TalkDeck } from "@/components/admin/TalkSlidesManager";
import FormTabs, { type FormTabDef } from "@/components/admin/FormTabs";
import { isSelectableForMission, selectableTalks } from "@/lib/briefings/archive";
import {
  saveMission,
  type SaveMissionInput,
} from "@/app/(admin)/admin/(protected)/einsaetze/actions";
import { createTalkQuick } from "@/app/(admin)/admin/(protected)/briefings/actions";

const W = 1000;
const H = 500;
type Loc = "de" | "en";

// Online-Einsätze haben keinen echten Ort. Damit sie trotzdem auf der Karte
// sichtbar sind, sitzen sie in der Antarktis — dort findet erkennbar keine
// Konferenz statt, der Punkt ist also als „ohne Ort" lesbar.
export const ONLINE_LOCATION = { lat: -75, lon: 0, countryCode: "AQ" };

export interface MissionFormInitial {
  missionId?: string;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  isOnline: boolean;
  caseFilePublic: boolean;
  startDate: string;
  endDate: string;
  status: string;
  eventUrl: string;
  talkId: string;
  language: string;
  /** Länge des Auftritts in Minuten, als Text fürs Eingabefeld. */
  durationMin: string;
  de: { eventText: string; talkText: string };
  en: { eventText: string; talkText: string } | null;
  photos: { id: string; url: string }[];
  banner: { id: string; url: string } | null;
  toolIds: string[];
  material: MissionMaterialForm;
}

export interface MissionMaterialForm {
  slidesFilePath: string;
  slidesFileName: string;
  sessionType: string;
  /** Publikum in drei Zahlen; als Text, weil sie aus Eingabefeldern kommen. */
  attendeesOnsite: string;
  attendeesRemote: string;
  onDemandViews: string;
  coSpeakers: string;
}

export const EMPTY_MATERIAL: MissionMaterialForm = {
  slidesFilePath: "", slidesFileName: "",
  sessionType: "", attendeesOnsite: "", attendeesRemote: "", onDemandViews: "", coSpeakers: "",
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Geplant",
  DONE: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const LANGUAGE_LABEL: Record<string, string> = { de: "Deutsch", en: "Englisch" };

export default function MissionForm({
  initial,
  existingPins,
  talks,
  categories = [],
  allTools = [],
  isEdit = false,
  videos,
  backToList = "/admin/einsaetze",
}: {
  initial: MissionFormInitial;
  /** Liste, in die nach dem Speichern zurückgekehrt wird — samt gesetzter Filter. */
  backToList?: string;
  existingPins: { lat: number; lon: number }[];
  // `titles`: Titel je Sprache — welcher im Dropdown steht, hängt an der
  // gewählten Vortragssprache. `durationMin`: Vorgabe des Briefings, im Einsatz
  // überschreibbar. `archivedAt`: Tag, ab dem es nicht mehr gehalten wird.
  talks: {
    id: string;
    titles: { de: string | null; en: string | null };
    toolIds: string[];
    durationMin: number | null;
    archivedAt: string | null;
    /** Am Briefing hinterlegte Foliensätze, je Sprache einer. */
    decks: TalkDeck[];
  }[];
  categories?: { id: string; name: string }[];
  allTools?: { id: string; name: string }[];
  isEdit?: boolean;
  /**
   * Der Bereich „Videos zu diesem Einsatz". Kommt als fertiger Baustein von der
   * Seite herein, weil er Server Actions braucht und diese Maske im Browser
   * läuft. Er steht IM Register Belegmaterial, nicht darunter: Die Maske soll
   * mit „Als Entwurf speichern" und „Einsatzakte veröffentlichen" abschließen.
   */
  videos?: React.ReactNode;
}) {
  const router = useRouter();
  const { landPath, graticulePath, projection } = useMemo(() => computeGeo(W, H), []);
  const svgRef = useRef<SVGSVGElement>(null);

  const [lat, setLat] = useState(initial.lat);
  const [lon, setLon] = useState(initial.lon);
  const [eventName, setEventName] = useState(initial.eventName);
  const [city, setCity] = useState(initial.city);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [isOnline, setIsOnline] = useState(initial.isOnline);
  const [caseFilePublic, setCaseFilePublic] = useState(initial.caseFilePublic);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [status, setStatus] = useState(initial.status || "PLANNED");
  const [eventUrl, setEventUrl] = useState(initial.eventUrl);
  const [talkId, setTalkId] = useState(initial.talkId);
  // Länge dieses Auftritts. Beim Wählen eines Briefings aus dessen Vorgabe
  // übernommen, danach frei änderbar — dieselbe Session dauert nicht überall gleich.
  const [durationMin, setDurationMin] = useState(initial.durationMin);
  const [talkList, setTalkList] = useState(talks);
  // Inline-Anlage eines neuen Briefings, ohne die Maske zu verlassen.
  const [showNewTalk, setShowNewTalk] = useState(false);
  const [newTalkTitle, setNewTalkTitle] = useState("");
  const [newTalkCategories, setNewTalkCategories] = useState<string[]>(
    categories[0] ? [categories[0].id] : [],
  );
  const [newTalkLevel, setNewTalkLevel] = useState("");
  const [newTalkDuration, setNewTalkDuration] = useState("");
  const [newTalkBusy, setNewTalkBusy] = useState(false);
  const [newTalkError, setNewTalkError] = useState<string | null>(null);
  const [language, setLanguage] = useState(initial.language || "de");
  const [loc, setLoc] = useState<Loc>("de");
  const [enEnabled, setEnEnabled] = useState(Boolean(initial.en));
  const [deText, setDeText] = useState(initial.de);
  const [enText, setEnText] = useState(initial.en ?? { eventText: "", talkText: "" });
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>(initial.photos);
  const [banner, setBanner] = useState<{ id: string; url: string } | null>(initial.banner);
  // Werkzeuge des Einsatzes: beim Wählen/Ändern eines Briefings von diesem
  // übernommen, danach frei anpassbar.
  const [toolIds, setToolIds] = useState<string[]>(initial.toolIds);
  const toggleTool = (tid: string) =>
    setToolIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
  const [material, setMaterial] = useState<MissionMaterialForm>(initial.material);
  const setMat = (part: Partial<MissionMaterialForm>) => setMaterial((prev) => ({ ...prev, ...part }));
  const slidesInputRef = useRef<HTMLInputElement>(null);
  const [slidesBusy, setSlidesBusy] = useState(false);
  const [slidesError, setSlidesError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [cx, cy] = project(projection, lon, lat);

  // Zwei Filter auf die Briefing-Auswahl:
  //  1. Sprache — angeboten wird, was es in der gewählten Vortragssprache gibt,
  //     und zwar mit DEM Titel: bei „Englisch" der englische, sonst der deutsche.
  //  2. Archiv — was zum Einsatzdatum schon abgelegt war, ist nicht mehr wählbar.
  // Ein bereits gewähltes Briefing bleibt in beiden Fällen sichtbar, damit eine
  // bestehende Zuordnung beim Öffnen einer alten Akte nicht verschwindet.
  const titleFor = (t: { titles: { de: string | null; en: string | null } }) =>
    (language === "en" ? t.titles.en : t.titles.de) ?? t.titles.de ?? t.titles.en ?? "(ohne Titel)";
  const talksForLanguage = talkList.filter((t) =>
    (language === "en" ? t.titles.en : t.titles.de)?.trim(),
  );
  const selectedTalk = talkList.find((t) => t.id === talkId);
  const talkOptionList = selectableTalks(
    // Ein bereits gewähltes Briefing, das die Sprache ausschließt, kommt hier
    // dazu — die Archivregel bekommt es dann ebenfalls durchgereicht.
    selectedTalk && !talksForLanguage.some((t) => t.id === selectedTalk.id)
      ? [selectedTalk, ...talksForLanguage]
      : talksForLanguage,
    startDate || null,
    talkId || null,
  );
  // Wie viele Briefings die Archivregel gerade ausblendet — als Hinweis, damit
  // ein „wo ist mein Briefing?" nicht in einer stummen Liste endet.
  const hiddenByArchive = talksForLanguage.filter(
    (t) => t.id !== talkId && !isSelectableForMission(t, startDate || null),
  ).length;

  // Der Foliensatz hängt am Briefing, nicht am Einsatz: Hier wird nur
  // angeboten, was dort hinterlegt ist — in der für diesen Einsatz gewählten
  // Vortragssprache. Wird oben auf Englisch umgestellt, wechselt der Download mit.
  const deck = pickForLanguage(selectedTalk?.decks ?? [], language);

  /** Online umschalten: Ort in die Antarktis setzen bzw. Eingaben freigeben. */
  function toggleOnline(next: boolean) {
    setIsOnline(next);
    if (next) {
      setLat(ONLINE_LOCATION.lat);
      setLon(ONLINE_LOCATION.lon);
      setCountryCode(ONLINE_LOCATION.countryCode);
    }
  }

  function handleMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const inverted = projection.invert?.([x, y]);
    if (inverted) {
      setLon(Number(inverted[0].toFixed(4)));
      setLat(Number(inverted[1].toFixed(4)));
    }
  }

  function addPhoto(item: MediaItem) {
    setShowPicker(false);
    setPhotos((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, { id: item.id, url: item.url }]));
  }

  function pickBanner(item: MediaItem) {
    setShowBannerPicker(false);
    setBanner({ id: item.id, url: item.url });
  }

  async function uploadSlides(file: File) {
    setSlidesError(null);
    setSlidesBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/missions/slides", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setSlidesError(data.error ?? "Upload fehlgeschlagen.");
        return;
      }
      setMat({ slidesFilePath: data.path, slidesFileName: data.name });
      showToast("Folien hochgeladen.");
    } catch {
      setSlidesError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSlidesBusy(false);
    }
  }

  async function handleSave(intent: SaveMissionInput["intent"]) {
    setSaving(true);
    setSaveStatus(null);
    const res = await saveMission({
      missionId: initial.missionId,
      eventName,
      city,
      // Online-Einsätze sitzen immer am selben symbolischen Ort (Antarktis) —
      // egal, was vor dem Umschalten in den Feldern stand.
      countryCode: isOnline ? ONLINE_LOCATION.countryCode : countryCode,
      lat: isOnline ? ONLINE_LOCATION.lat : lat,
      lon: isOnline ? ONLINE_LOCATION.lon : lon,
      isOnline,
      caseFilePublic,
      startDate,
      endDate: endDate || null,
      status,
      eventUrl,
      bannerAssetId: banner?.id ?? null,
      talkId: talkId || null,
      language,
      durationMin: durationMin.trim() ? Number(durationMin) : null,
      de: deText,
      en: enEnabled ? enText : null,
      photoAssetIds: photos.map((p) => p.id),
      toolIds,
      material: {
        slidesFilePath: material.slidesFilePath || null,
        slidesFileName: material.slidesFileName || null,
        sessionType: material.sessionType || null,
        attendeesOnsite: material.attendeesOnsite ? Number(material.attendeesOnsite) : null,
        attendeesRemote: material.attendeesRemote ? Number(material.attendeesRemote) : null,
        onDemandViews: material.onDemandViews ? Number(material.onDemandViews) : null,
        coSpeakers: material.coSpeakers,
      },
      intent,
    });
    if (res.ok) {
      // Zurück zur Liste — mit sichtbarer Rückmeldung. Verhindert zugleich das
      // versehentliche Doppelt-Anlegen bei erneutem Klick auf „Speichern".
      router.push(
        withParams(backToList, {
          ok: intent === "publish" ? "published" : intent === "archive" ? "archived" : "saved",
        }),
      );
      return;
    }
    setSaving(false);
    setSaveStatus(res.error ?? "Fehler.");
  }

  async function handleCreateTalk() {
    setNewTalkError(null);
    if (!newTalkTitle.trim() || newTalkCategories.length === 0) {
      setNewTalkError("Titel und mindestens eine Kategorie sind Pflicht.");
      return;
    }
    setNewTalkBusy(true);
    const quickDuration = newTalkDuration ? Number(newTalkDuration) : null;
    const res = await createTalkQuick({
      deTitle: newTalkTitle,
      categoryIds: newTalkCategories,
      level: newTalkLevel,
      durationMin: Number.isFinite(quickDuration as number) ? quickDuration : null,
    });
    setNewTalkBusy(false);
    if (!res.ok || !res.id) {
      setNewTalkError(res.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    // Neues Briefing in die Auswahl übernehmen und direkt selektieren. Die
    // Schnellanlage kennt nur einen deutschen Titel — deshalb Sprache „de".
    setTalkList((prev) => [
      {
        id: res.id!,
        // Die Schnellanlage kennt nur einen deutschen Titel.
        titles: { de: res.name ?? newTalkTitle, en: null },
        toolIds: [],
        durationMin: newTalkDuration ? Number(newTalkDuration) : null,
        archivedAt: null,
        // Frisch angelegt: Folien werden im Briefing hinterlegt.
        decks: [],
      },
      ...prev,
    ]);
    setTalkId(res.id);
    setToolIds([]);
    setShowNewTalk(false);
    setNewTalkTitle("");
    setNewTalkLevel("");
    setNewTalkDuration("");
  }

  const text = loc === "de" ? deText : enText;
  const setText = loc === "de" ? setDeText : setEnText;

  // Die Maske in vier Registern statt einer Endlosseite. Alle Panels bleiben im
  // DOM (`FormTabs` blendet nur aus) — der Zustand liegt ohnehin in dieser
  // Komponente, und ein Wechsel darf nichts verwerfen. Gespeichert wird
  // unabhängig vom sichtbaren Register: die Knöpfe stehen unter den Registern.
  const tabs: FormTabDef[] = [
    {
      id: "einsatzdaten",
      label: "Einsatzdaten",
      content: (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Ort auf der Karte anklicken oder Koordinaten eintragen.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 12 }}>
            {isOnline ? (
              <div className="card bracket">
                <p className="eyebrow">Ort</p>
                <p className="muted" style={{ marginTop: 6 }}>
                  Online-Einsatz, kein fester Ort. Auf der Karte erscheint er in der Antarktis;
                  dort findet sonst nichts statt, der Punkt ist also als „ortlos“ erkennbar.
                </p>
                <p className="meta" style={{ marginBottom: 0 }}>
                  Zum Eintragen echter Koordinaten den Haken bei „Online-Event“ entfernen.
                </p>
              </div>
            ) : (
            <div className="map-shell">
              <svg
                ref={svgRef}
                className="map"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label="Karte zur Auswahl des Einsatzortes"
                onClick={handleMapClick}
                style={{ cursor: "crosshair" }}
              >
                <path className="graticule" d={graticulePath} />
                <path className="landmass" d={landPath} />
                {existingPins.map((p, i) => {
                  const [x, y] = project(projection, p.lon, p.lat);
                  return <circle key={i} cx={x} cy={y} r={2.4} fill="var(--magenta)" opacity={0.4} />;
                })}
                <line className="crosshair" x1={cx} y1={0} x2={cx} y2={H} opacity={0.5} />
                <line className="crosshair" x1={0} y1={cy} x2={W} y2={cy} opacity={0.5} />
                <circle cx={cx} cy={cy} r={5} fill="var(--signal)" stroke="#fff" strokeWidth={0.6} />
              </svg>
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line-soft)" }}>
                <p className="meta" style={{ marginTop: 0 }}>
                  Klick auf die Karte grob setzen oder exakte Koordinaten eintragen (z. B. aus
                  Google/Bing Maps: Rechtsklick auf den Ort → Koordinaten kopieren).
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <label className="f" style={{ margin: 0 }}>
                    Breite (N)
                    <input
                      className="f"
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      style={{ maxWidth: 140 }}
                      aria-label="Breitengrad"
                    />
                  </label>
                  <label className="f" style={{ margin: 0 }}>
                    Länge (O)
                    <input
                      className="f"
                      type="number"
                      step="0.0001"
                      value={lon}
                      onChange={(e) => setLon(Number(e.target.value))}
                      style={{ maxWidth: 140 }}
                      aria-label="Längengrad"
                    />
                  </label>
                </div>
              </div>
            </div>
            )}

            <div className="card bracket">
              <p className="eyebrow">Einsatzdaten</p>
              <label className="f">Veranstaltung</label>
              <input className="f" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              <label className="f">Website der Veranstaltung (optional)</label>
              <input className="f" placeholder="https://…" value={eventUrl} onChange={(e) => setEventUrl(e.target.value)} />
              <label className="f">Sprache des Vortrags</label>
              <select className="f" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="f" style={{ margin: 0 }}>Gehaltenes Briefing</label>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setShowNewTalk((v) => !v)}
                >
                  {showNewTalk ? "Abbrechen" : "+ Neues Briefing"}
                </button>
              </div>
              <select
                className="f"
                value={talkId}
                onChange={(e) => {
                  const v = e.target.value;
                  setTalkId(v);
                  const t = talkList.find((x) => x.id === v);
                  // Werkzeuge und Dauer des gewählten Briefings übernehmen (leert die
                  // Auswahl, wenn „keins" gewählt ist); danach weiter anpassbar.
                  setToolIds(t ? t.toolIds : []);
                  if (t?.durationMin != null) setDurationMin(String(t.durationMin));
                }}
              >
                <option value="">— keins —</option>
                {talkOptionList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {titleFor(t)}
                    {t.archivedAt ? " (Archiv)" : ""}
                  </option>
                ))}
              </select>
              <p className="meta" style={{ marginTop: 4 }}>
                Zeigt nur Briefings, die es auf {language === "de" ? "Deutsch" : "Englisch"} gibt und die
                zum Einsatzdatum noch gehalten wurden.
                {talksForLanguage.length === 0 && talkList.length > 0
                  ? " Für diese Sprache ist noch keines hinterlegt: Titel im Briefing ergänzen."
                  : ""}
                {hiddenByArchive > 0
                  ? ` ${hiddenByArchive} archivierte${hiddenByArchive === 1 ? "s" : ""} ausgeblendet, mit einem früheren Datum tauchen sie wieder auf.`
                  : ""}
              </p>

              {showNewTalk ? (
                <div className="card bracket" style={{ marginTop: 10, padding: 12 }}>
                  <p className="eyebrow" style={{ marginTop: 0 }}>Neues Briefing anlegen</p>
                  <label className="f">Titel (DE)</label>
                  <input
                    className="f"
                    value={newTalkTitle}
                    onChange={(e) => setNewTalkTitle(e.target.value)}
                    placeholder="z. B. Agents in Produktion"
                  />
                  <label className="f">Kategorien (Mehrfachauswahl)</label>
                  <CategoryMultiSelect
                    options={categories}
                    value={newTalkCategories}
                    onChange={setNewTalkCategories}
                    emptyHint="Erst eine Kategorie unter „Briefings“ anlegen."
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ flex: 1 }}>
                      <label className="f">Level</label>
                      <input className="f" value={newTalkLevel} onChange={(e) => setNewTalkLevel(e.target.value)} placeholder="300" />
                    </span>
                    <span style={{ flex: 1 }}>
                      <label className="f">Dauer (Min.)</label>
                      <input className="f" type="number" value={newTalkDuration} onChange={(e) => setNewTalkDuration(e.target.value)} placeholder="45" />
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn solid sm"
                    style={{ marginTop: 10 }}
                    disabled={newTalkBusy || categories.length === 0}
                    onClick={handleCreateTalk}
                  >
                    {newTalkBusy ? "Legt an …" : "Anlegen und auswählen"}
                  </button>
                  {newTalkError ? <p className="meta" style={{ marginTop: 8, color: "var(--danger)" }}>{newTalkError}</p> : null}
                </div>
              ) : null}

              <label className="f" style={{ marginTop: 12 }} htmlFor="mission-cospeakers">
                Co-Speaker (eine Zeile je Person: „Name | https://…“)
              </label>
              <textarea
                className="f"
                id="mission-cospeakers"
                rows={2}
                value={material.coSpeakers}
                onChange={(e) => setMat({ coSpeakers: e.target.value })}
                placeholder={"Max Muster | https://linkedin.com/in/…"}
              />

              <label className="f" style={{ marginTop: 12 }}>Dauer (Minuten)</label>
              <input
                className="f"
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="aus dem Briefing"
                style={{ maxWidth: 160 }}
              />
              <p className="meta" style={{ marginTop: 4 }}>
                Vorbelegt aus dem Briefing, hier für diesen Auftritt änderbar.
              </p>

              <label className="f" style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 6px" }}>
                <input type="checkbox" checked={isOnline} onChange={(e) => toggleOnline(e.target.checked)} style={{ width: "auto" }} />
                Online-/Remote-Event (ohne festen Ort, erscheint auf der Karte in der Antarktis)
              </label>
              <label className="f">Stadt</label>
              <input className="f" value={city} onChange={(e) => setCity(e.target.value)} placeholder={isOnline ? "z. B. Online" : ""} />
              {!isOnline ? (
                <>
                  <label className="f">Ländercode (2 Buchstaben)</label>
                  <input className="f" value={countryCode} maxLength={2} onChange={(e) => setCountryCode(e.target.value)} />
                </>
              ) : null}
              <label className="f">Datum (Beginn)</label>
              <input className="f" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <label className="f">Enddatum (optional, bei mehrtägigen Einsätzen)</label>
              <input className="f" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <label className="f">Status</label>
              <select className="f" value={status} onChange={(e) => setStatus(e.target.value)}>
                {MISSION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>

              <label className="f" style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 4px" }}>
                <input type="checkbox" checked={caseFilePublic} onChange={(e) => setCaseFilePublic(e.target.checked)} style={{ width: "auto" }} />
                Einsatzakte öffentlich zeigen
              </label>
              <p className="meta" style={{ marginTop: 0 }}>
                Erst mit diesem Haken erscheint der Button „Einsatzakte öffnen“ (Karte und Liste).
                Ohne ihn bleibt der Einsatz sichtbar, führt aber auf keine leere Detailseite.
              </p>

              <label className="f" style={{ marginTop: 10 }}>Werkzeuge</label>
              <p className="meta" style={{ marginTop: 0 }}>
                Beim Wählen eines Briefings übernommen, hier anpassbar (an-/abwählen).
              </p>
              {allTools.length === 0 ? (
                <p className="meta" style={{ margin: 0 }}>Noch keine Werkzeuge angelegt (bei den Identitäten pflegen).</p>
              ) : (
                <div className="filter-row">
                  {allTools.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="chip sm"
                      aria-pressed={toolIds.includes(t.id)}
                      onClick={() => toggleTool(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      id: "texte",
      label: "Texte",
      content: (
        <>
          <div className="lang-tabs" role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--line-soft)" }}>
            <button role="tab" aria-selected={loc === "de"} className="btn ghost sm" style={{ border: 0 }} onClick={() => setLoc("de")}>DEUTSCH</button>
            <button role="tab" aria-selected={loc === "en"} disabled={!enEnabled} className="btn ghost sm" style={{ border: 0 }} onClick={() => setLoc("en")}>ENGLISH</button>
            {!enEnabled ? (
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setEnEnabled(true)}>EN hinzufügen</button>
            ) : null}
          </div>

          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card bracket">
              <p className="eyebrow">Text: Die Veranstaltung</p>
              <RichTextField
                key={`${loc}-eventText`}
                defaultValue={text.eventText}
                ariaLabel="Text: Die Veranstaltung"
                onChange={(v) => setText({ ...text, eventText: v })}
              />
            </div>
            <div className="card bracket">
              <p className="eyebrow">Text: Mein Briefing</p>
              <RichTextField
                key={`${loc}-talkText`}
                defaultValue={text.talkText}
                ariaLabel="Text: Mein Briefing"
                onChange={(v) => setText({ ...text, talkText: v })}
              />
            </div>
          </div>
        </>
      ),
    },
    {
      id: "bilder",
      label: "Bilder",
      content: (
        <>
          <div className="card bracket">
            <p className="eyebrow">Social-Banner der Veranstaltung</p>
            <p className="meta" style={{ marginTop: 0 }}>
              Vom Veranstalter bereitgestelltes Banner. Erscheint klein im Karten-Popup.
            </p>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 6 }}>
              <div
                style={{
                  width: 220,
                  aspectRatio: "16 / 9",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "var(--surface-2, #1a1420)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.url} alt="Banner-Vorschau" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="meta" style={{ padding: 8, textAlign: "center" }}>Kein Banner gewählt</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" className="btn ghost sm" onClick={() => setShowBannerPicker(true)}>Banner wählen / hochladen</button>
                {banner ? (
                  <button type="button" className="btn ghost sm" onClick={() => setBanner(null)}>Entfernen</button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card bracket" style={{ marginTop: 16 }}>
            <p className="eyebrow">Fotos vom Einsatz</p>
            <div className="grid g4">
              {photos.map((p) => (
                <div key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" style={{ width: "100%", borderRadius: 4 }} />
                  <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}>
                    Entfernen
                  </button>
                </div>
              ))}
              <button className="ph" style={{ borderStyle: "dashed", cursor: "pointer" }} onClick={() => setShowPicker(true)}>
                + Hochladen
              </button>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "material",
      label: "Belegmaterial",
      content: (
        <>
          <div className="card bracket">
            {/* Die Folien stehen oben: sie sind das, was nach einem Auftritt
                als Erstes gesucht wird. Alles Weitere darunter. */}
            <p className="eyebrow" style={{ marginTop: 0 }}>
              Foliensatz aus dem Briefing ({LANGUAGE_LABEL[language] ?? "Deutsch"})
            </p>
            {!talkId ? (
              <p className="meta" style={{ marginTop: 0 }}>
                Erst ein Briefing wählen: die Folien hängen am Briefing, nicht am einzelnen Einsatz.
              </p>
            ) : deck ? (
              <>
                <p className="meta" style={{ marginTop: 0 }}>
                  {deck.matchesLanguage
                    ? "Der am Briefing hinterlegte Foliensatz in der gewählten Vortragssprache."
                    : `Auf ${LANGUAGE_LABEL[language] ?? "dieser Sprache"} ist am Briefing noch kein Foliensatz hinterlegt, hier steht die ${LANGUAGE_LABEL[deck.item.locale] ?? deck.item.locale}-Fassung.`}
                </p>
                <a className="btn ghost sm" href={deckUrl(deck.item)} download={deck.item.fileName}>
                  ⬇ {deck.item.fileName}
                </a>{" "}
                {deck.item.bytes ? <span className="meta">{formatMb(deck.item.bytes)}</span> : null}
              </>
            ) : (
              <p className="meta" style={{ marginTop: 0 }}>
                Für dieses Briefing ist noch keine PowerPoint hinterlegt.{" "}
                <a href={`/admin/briefings/bearbeiten?id=${talkId}`} target="_blank" rel="noopener noreferrer">
                  Im Briefing hinterlegen
                </a>{" "}
                dort steht auch die Vorlage zum Anfangen bereit.
              </p>
            )}

            <div style={{ marginTop: 12, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
              <p className="eyebrow" style={{ marginTop: 0 }}>Folien als PDF</p>
              <p className="meta" style={{ marginTop: 0 }}>
                PDF hochladen (max. 20 MB), wird auf der öffentlichen Einsatzseite zum Download angeboten.
              </p>
              <input
                ref={slidesInputRef}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadSlides(f);
                  e.target.value = "";
                }}
              />
              {material.slidesFilePath ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <a className="btn ghost sm" href={assetUrl(material.slidesFilePath)} target="_blank" rel="noopener noreferrer">
                    📄 {material.slidesFileName || "folien.pdf"}
                  </a>
                  <button type="button" className="btn ghost sm" disabled={slidesBusy} onClick={() => slidesInputRef.current?.click()}>
                    {slidesBusy ? "Lädt hoch …" : "Ersetzen"}
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setMat({ slidesFilePath: "", slidesFileName: "" })}>
                    Entfernen
                  </button>
                </div>
              ) : (
                <button type="button" className="btn ghost sm" disabled={slidesBusy} onClick={() => slidesInputRef.current?.click()}>
                  {slidesBusy ? "Lädt hoch …" : "PDF hochladen"}
                </button>
              )}
              {slidesError ? <p className="meta" style={{ marginTop: 8, color: "var(--danger)" }}>{slidesError}</p> : null}
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
              <p className="eyebrow" style={{ marginTop: 0 }}>Aufzeichnung und Publikum</p>
              <p className="meta" style={{ marginTop: 0 }}>Alles optional. Leere Angaben erscheinen öffentlich nicht.</p>
              {/* Vier Felder in einer Zeile: die Art des Auftritts zuerst, dann
                  das Publikum. Drei Zahlen statt einer — ein Webinar mit 40 im
                  Raum und 900 online sieht sonst aus wie eine kleine Runde. */}
              <div className="field-row g4" style={{ marginTop: 4 }}>
                <label className="f">Art des Auftritts
                  <select className="f" value={material.sessionType} onChange={(e) => setMat({ sessionType: e.target.value })}>
                    <option value="">— keine —</option>
                    {SESSION_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="f">Teilnehmende (Präsenz)
                  <input className="f" type="number" min={0} value={material.attendeesOnsite} onChange={(e) => setMat({ attendeesOnsite: e.target.value })} />
                </label>
                <label className="f">Teilnehmende (Remote)
                  <input className="f" type="number" min={0} value={material.attendeesRemote} onChange={(e) => setMat({ attendeesRemote: e.target.value })} />
                </label>
                <label className="f">On-Demand-Ansichten
                  <input className="f" type="number" min={0} value={material.onDemandViews} onChange={(e) => setMat({ onDemandViews: e.target.value })} />
                </label>
              </div>
              {videos ? <div style={{ marginTop: 18 }}>{videos}</div> : null}
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <section>
      <h1>{isEdit ? "Einsatz bearbeiten" : "Einsatz erfassen"}</h1>

      <FormTabs tabs={tabs} />

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <button className="btn ghost" disabled={saving} onClick={() => handleSave("draft")}>Als Entwurf speichern</button>
        <button className="btn solid" disabled={saving} onClick={() => handleSave("publish")}>Einsatzakte veröffentlichen</button>
        {isEdit ? (
          // Archivieren statt löschen: der Einsatz bleibt in der Historie und in
          // der Auswertung, verschwindet aber aus der laufenden Arbeit.
          <button className="btn ghost" disabled={saving} onClick={() => handleSave("archive")} style={{ marginLeft: "auto" }}>
            Ins Archiv legen
          </button>
        ) : null}
      </div>
      {saveStatus ? <p className="meta" style={{ marginTop: 10 }}>{saveStatus}</p> : null}

      {showPicker ? <MediaPicker onPick={addPhoto} onClose={() => setShowPicker(false)} /> : null}
      {showBannerPicker ? <MediaPicker onPick={pickBanner} onClose={() => setShowBannerPicker(false)} /> : null}
    </section>
  );
}
