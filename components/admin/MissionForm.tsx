"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeGeo, project } from "@/lib/map/geo";
import { MISSION_STATUSES } from "@/lib/domain";
import MediaPicker, { type MediaItem } from "@/components/admin/editor/MediaPicker";
import {
  saveMission,
  type SaveMissionInput,
} from "@/app/(admin)/admin/(protected)/einsaetze/actions";
import { createTalkQuick } from "@/app/(admin)/admin/(protected)/briefings/actions";

const W = 1000;
const H = 500;
type Loc = "de" | "en";

export interface MissionFormInitial {
  missionId?: string;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  startDate: string;
  status: string;
  eventUrl: string;
  talkId: string;
  language: string;
  de: { eventText: string; talkText: string };
  en: { eventText: string; talkText: string } | null;
  photos: { id: string; url: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Geplant",
  DONE: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

export default function MissionForm({
  initial,
  existingPins,
  talks,
  categories = [],
  isEdit = false,
}: {
  initial: MissionFormInitial;
  existingPins: { lat: number; lon: number }[];
  talks: { id: string; name: string }[];
  categories?: { id: string; name: string }[];
  isEdit?: boolean;
}) {
  const router = useRouter();
  const { landPath, graticulePath, projection } = useMemo(() => computeGeo(W, H), []);
  const svgRef = useRef<SVGSVGElement>(null);

  const [lat, setLat] = useState(initial.lat);
  const [lon, setLon] = useState(initial.lon);
  const [eventName, setEventName] = useState(initial.eventName);
  const [city, setCity] = useState(initial.city);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [status, setStatus] = useState(initial.status || "PLANNED");
  const [eventUrl, setEventUrl] = useState(initial.eventUrl);
  const [talkId, setTalkId] = useState(initial.talkId);
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
  const [showPicker, setShowPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [cx, cy] = project(projection, lon, lat);

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

  async function handleSave(intent: SaveMissionInput["intent"]) {
    setSaving(true);
    setSaveStatus(null);
    const res = await saveMission({
      missionId: initial.missionId,
      eventName,
      city,
      countryCode,
      lat,
      lon,
      startDate,
      status,
      eventUrl,
      talkId: talkId || null,
      language,
      de: deText,
      en: enEnabled ? enText : null,
      photoAssetIds: photos.map((p) => p.id),
      intent,
    });
    if (res.ok) {
      // Zurück zur Liste — mit sichtbarer Rückmeldung. Verhindert zugleich das
      // versehentliche Doppelt-Anlegen bei erneutem Klick auf „Speichern".
      router.push(`/admin/einsaetze?ok=${intent === "publish" ? "published" : "saved"}`);
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
    const durationMin = newTalkDuration ? Number(newTalkDuration) : null;
    const res = await createTalkQuick({
      deTitle: newTalkTitle,
      categoryIds: newTalkCategories,
      level: newTalkLevel,
      durationMin: Number.isFinite(durationMin as number) ? durationMin : null,
    });
    setNewTalkBusy(false);
    if (!res.ok || !res.id) {
      setNewTalkError(res.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    // Neues Briefing in die Auswahl übernehmen und direkt selektieren.
    setTalkList((prev) => [{ id: res.id!, name: res.name ?? newTalkTitle }, ...prev]);
    setTalkId(res.id);
    setShowNewTalk(false);
    setNewTalkTitle("");
    setNewTalkLevel("");
    setNewTalkDuration("");
  }

  const text = loc === "de" ? deText : enText;
  const setText = loc === "de" ? setDeText : setEnText;

  return (
    <section>
      <h1>{isEdit ? "Einsatz bearbeiten" : "Einsatz erfassen"}</h1>
      <p className="muted">Ort auf der Karte anklicken oder Koordinaten eintragen.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 20 }}>
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
            <span className="meta">
              Gesetzt: {lat.toFixed(4)} N / {lon.toFixed(4)} O
            </span>
          </div>
        </div>

        <div className="card bracket">
          <p className="eyebrow">Einsatzdaten</p>
          <label className="f">Veranstaltung</label>
          <input className="f" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          <label className="f">Stadt</label>
          <input className="f" value={city} onChange={(e) => setCity(e.target.value)} />
          <label className="f">Ländercode (2 Buchstaben)</label>
          <input className="f" value={countryCode} maxLength={2} onChange={(e) => setCountryCode(e.target.value)} />
          <label className="f">Datum</label>
          <input className="f" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <label className="f">Status</label>
          <select className="f" value={status} onChange={(e) => setStatus(e.target.value)}>
            {MISSION_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
          <label className="f">Website der Veranstaltung (optional)</label>
          <input className="f" placeholder="https://…" value={eventUrl} onChange={(e) => setEventUrl(e.target.value)} />
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
          <select className="f" value={talkId} onChange={(e) => setTalkId(e.target.value)}>
            <option value="">— keins —</option>
            {talkList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

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
              {categories.length === 0 ? (
                <p className="meta">Erst eine Kategorie unter „Briefings“ anlegen.</p>
              ) : (
                <select
                  className="f"
                  multiple
                  size={Math.min(5, Math.max(2, categories.length))}
                  value={newTalkCategories}
                  onChange={(e) => setNewTalkCategories(Array.from(e.target.selectedOptions, (o) => o.value))}
                  aria-label="Kategorien (Mehrfachauswahl)"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
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
          <label className="f">Sprache des Vortrags</label>
          <select className="f" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
        </div>
      </div>

      <div className="lang-tabs" role="tablist" style={{ display: "flex", marginTop: 20, borderBottom: "1px solid var(--line-soft)" }}>
        <button role="tab" aria-selected={loc === "de"} className="btn ghost sm" style={{ border: 0 }} onClick={() => setLoc("de")}>DEUTSCH</button>
        <button role="tab" aria-selected={loc === "en"} disabled={!enEnabled} className="btn ghost sm" style={{ border: 0 }} onClick={() => setLoc("en")}>ENGLISH</button>
        {!enEnabled ? (
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setEnEnabled(true)}>EN hinzufügen</button>
        ) : null}
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card bracket">
          <p className="eyebrow">Text: Die Veranstaltung</p>
          <textarea className="f" rows={6} value={text.eventText} onChange={(e) => setText({ ...text, eventText: e.target.value })} />
        </div>
        <div className="card bracket">
          <p className="eyebrow">Text: Mein Briefing</p>
          <textarea className="f" rows={6} value={text.talkText} onChange={(e) => setText({ ...text, talkText: e.target.value })} />
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

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button className="btn ghost" disabled={saving} onClick={() => handleSave("draft")}>Als Entwurf speichern</button>
        <button className="btn solid" disabled={saving} onClick={() => handleSave("publish")}>Einsatzakte veröffentlichen</button>
      </div>
      {saveStatus ? <p className="meta" style={{ marginTop: 10 }}>{saveStatus}</p> : null}

      {showPicker ? <MediaPicker onPick={addPhoto} onClose={() => setShowPicker(false)} /> : null}
    </section>
  );
}
