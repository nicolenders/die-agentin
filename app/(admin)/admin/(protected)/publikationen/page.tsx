import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import ConfirmButton from "@/components/admin/ConfirmButton";
import AssetPickerField from "@/components/admin/AssetPickerField";
import AssetImage from "@/components/media/AssetImage";
import Flash from "@/components/admin/Flash";
import Tabs, { type TabDef } from "@/components/admin/Tabs";
import { createPublication, deletePublication, importVideos, refreshVideoThumbnail } from "./actions";
import { extractYouTubeId, MAX_IMPORT_LINES } from "@/lib/video/youtube";
import { pageWindow, paginate, parsePage } from "@/lib/admin/pagination";

export const metadata = { title: "Publikationen · Zentrale" };

const PUB_TYPES = [
  { id: "BOOK", label: "Bücher", singular: "Buch" },
  { id: "COURSE", label: "Kurse", singular: "Kurs" },
  { id: "REPOSITORY", label: "Repositories", singular: "Repository" },
  { id: "ARTICLE", label: "Fachartikel", singular: "Fachartikel" },
  { id: "WHITEPAPER", label: "Whitepaper", singular: "Whitepaper" },
] as const;

interface PubRow {
  id: string;
  title: string;
  type: string;
  year: number;
  role: string | null;
  coverUrl: string | null;
  coverAlt: string;
  coverAi: boolean;
  /** Nur bei Videos gefüllt: Kanal und Kennung. */
  publisher: string | null;
  url: string | null;
  videoId: string | null;
}

/** Wie viele Videos je Seite. Sie sind mit Vorschaubild höher als eine Zeile. */
const VIDEOS_PER_PAGE = 24;

export default async function PublikationenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    err?: string;
    tab?: string;
    kanal?: string;
    seite?: string;
    neu?: string;
    uebersprungen?: string;
    ohnebild?: string;
    fehler?: string;
  }>;
}) {
  const sp = await searchParams;
  const { ok, err } = sp;

  let pubs: PubRow[] = [];
  let dbError = false;
  try {
    const rows = await db.publication.findMany({
      orderBy: { year: "desc" },
      include: { translations: { where: { locale: "de" } }, coverAsset: true },
    });
    pubs = rows.map((p) => ({
      id: p.id,
      title: p.translations[0]?.title ?? "(ohne Titel)",
      type: p.type,
      year: p.year,
      role: p.translations[0]?.role ?? null,
      coverUrl: p.coverAsset ? assetUrl(p.coverAsset.blobPath) : null,
      coverAlt: p.coverAsset?.altDe || p.translations[0]?.title || "Cover",
      coverAi: p.coverAsset?.source === "AI",
      publisher: p.publisher,
      url: p.url,
      videoId: extractYouTubeId(p.url),
    }));
  } catch {
    dbError = true;
  }

  const list = (type: string) => {
    const rows = pubs.filter((p) => p.type === type);
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>Noch nichts erfasst.</p>;
    return (
      <table style={{ marginTop: 4 }}>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              {type === "BOOK" || type === "COURSE" ? (
                <td style={{ width: 60 }}>
                  {p.coverUrl ? (
                    <AssetImage
                      compact
                      aiLabel="KI"
                      src={p.coverUrl}
                      alt={p.coverAlt}
                      ai={p.coverAi}
                      imgStyle={
                        type === "COURSE"
                          ? { width: 64, height: 36, objectFit: "cover", borderRadius: 3 }
                          : { width: 46, height: 62, objectFit: "cover", borderRadius: 3 }
                      }
                    />
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
              ) : null}
              <td>
                <b>{p.title}</b>
                <div className="meta">{[p.year, p.role].filter(Boolean).join(" · ")}</div>
              </td>
              <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                <Link className="btn ghost sm" href={`/admin/publikationen/bearbeiten?pub=${p.id}`}>Bearbeiten</Link>{" "}
                <form action={deletePublication} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton confirmText={`„${p.title}" wirklich löschen?`}>Löschen</ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const form = (type: string, singular: string) => (
    <form action={createPublication}>
      <input type="hidden" name="type" value={type} />
      {type === "ARTICLE" ? (
        <p className="meta" style={{ marginTop: 0 }}>Auch Gastbeiträge in fremden Blogs (z. B. MVP-Treff, Microsoft): Medium und Link angeben.</p>
      ) : null}
      {type === "COURSE" ? (
        <p className="meta" style={{ marginTop: 0 }}>Eigene Trainings, z. B. auf LinkedIn Learning. Plattform und Link zum Kurs angeben; Thumbnail optional.</p>
      ) : null}
      <label className="f">Titel (DE)</label>
      <input className="f" name="deTitle" placeholder={type === "COURSE" ? "Kurstitel" : "Titel"} required />
      <label className="f">Jahr</label>
      <input className="f" name="year" type="number" defaultValue={2026} />
      <label className="f">{type === "COURSE" ? "Rolle" : "Rolle (z. B. Co-Autorin)"}</label>
      <input className="f" name="role" defaultValue={type === "COURSE" ? "Trainerin" : undefined} />
      <label className="f">{type === "ARTICLE" ? "Medium / Blog" : type === "COURSE" ? "Plattform" : "Verlag / Medium"}</label>
      <input
        className="f"
        name="publisher"
        defaultValue={type === "COURSE" ? "LinkedIn Learning" : undefined}
        placeholder={type === "ARTICLE" ? "z. B. MVP-Treff, Microsoft Tech Community" : ""}
      />
      {type === "BOOK" ? (
        <>
          <label className="f">ISBN (optional)</label>
          <input className="f" name="isbn" />
        </>
      ) : null}
      {type === "REPOSITORY" ? (
        <>
          <label className="f">Repository-URL</label>
          <input className="f" name="repoUrl" placeholder="https://github.com/…" />
          <label className="f">Programmiersprache (optional)</label>
          <input className="f" name="language" placeholder="TypeScript" />
          <label className="f">Beschreibung (DE)</label>
          <textarea className="f" name="description" rows={2} />
        </>
      ) : null}
      <label className="f">{type === "COURSE" ? "Link zum Kurs" : type === "REPOSITORY" ? "Alternativer Link (optional)" : "Link (optional)"}</label>
      <input className="f" name="url" placeholder="https://…" />
      {type === "BOOK" ? (
        <>
          <label className="f">Cover (optional)</label>
          <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="3 / 4" emptyHint="Kein Cover gewählt" />
        </>
      ) : type === "COURSE" ? (
        <>
          <label className="f">Thumbnail (optional)</label>
          <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="16 / 9" emptyHint="Kein Thumbnail gewählt" />
        </>
      ) : (
        <input type="hidden" name="coverAssetId" value="" />
      )}
      <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ {singular} anlegen</button>
    </form>
  );

  // ------------------------------------------------------------------ Videos
  //
  // Eigener Aufbau statt „links anlegen, rechts verwalten": Videos kommen
  // selten einzeln. Oben werden viele Adressen auf einmal eingefügt, unten
  // stehen die vorhandenen mit Vorschaubild, gefiltert nach Kanal und
  // seitenweise — bei dreistelligen Zahlen ist eine endlose Liste unbrauchbar.
  const allVideos = pubs.filter((p) => p.type === "VIDEO");
  const channels = [...new Set(allVideos.map((v) => v.publisher).filter((c): c is string => Boolean(c)))].sort(
    (a, b) => a.localeCompare(b, "de"),
  );
  const channel = sp.kanal && channels.includes(sp.kanal) ? sp.kanal : "";
  const filteredVideos = channel ? allVideos.filter((v) => v.publisher === channel) : allVideos;
  const videoPage = paginate(filteredVideos.length, parsePage(sp.seite), VIDEOS_PER_PAGE);
  const videosOnPage = filteredVideos.slice(videoPage.offset, videoPage.offset + videoPage.pageSize);

  const videoHref = (next: { kanal?: string; seite?: number }) => {
    const params = new URLSearchParams({ tab: "videos" });
    const k = next.kanal !== undefined ? next.kanal : channel;
    if (k) params.set("kanal", k);
    // Beim Kanalwechsel zurück auf Seite 1: Seite 7 eines anderen Kanals gibt
    // es meist nicht, und eine leere Liste sähe aus wie „nichts vorhanden".
    const page = next.seite ?? (next.kanal !== undefined ? 1 : videoPage.page);
    if (page > 1) params.set("seite", String(page));
    return `/admin/publikationen?${params}`;
  };

  const importReport =
    ok === "videos-imported" ? (
      <p className="meta" style={{ marginTop: 0 }}>
        <b>{sp.neu ?? "0"} neu angelegt.</b>{" "}
        {Number(sp.uebersprungen ?? 0) > 0 ? `${sp.uebersprungen} übersprungen (schon vorhanden, doppelt oder unlesbar). ` : ""}
        {Number(sp.ohnebild ?? 0) > 0
          ? `${sp.ohnebild} ohne Vorschaubild — bei diesen unten „Bild holen“ versuchen. `
          : ""}
        {Number(sp.fehler ?? 0) > 0 ? `${sp.fehler} fehlgeschlagen, siehe Serverprotokoll.` : ""}
      </p>
    ) : null;

  const videoTab = (
    <div style={{ marginTop: 12 }}>
      <p className="eyebrow" style={{ marginTop: 0 }}>Videos hinzufügen</p>
      <p className="meta" style={{ marginTop: -6 }}>
        Eine YouTube-Adresse je Zeile, höchstens {MAX_IMPORT_LINES} auf einmal. Titel und Kanal holt
        die Anwendung selbst, das Vorschaubild wandert in die eigene Medienablage — auf der Website
        entsteht dadurch keine Verbindung zu YouTube, solange niemand klickt.
      </p>
      <p className="meta">
        YouTube verrät über diesen Weg kein Veröffentlichungsdatum. Ohne Angabe steht deshalb das
        laufende Jahr da; wer es gleich richtig haben will, schreibt es hinter einen senkrechten
        Strich: <code>https://youtu.be/… | 2021</code>. Zeilen mit <code>#</code> am Anfang werden
        übergangen — praktisch, um nach Kanal zu gliedern.
      </p>
      {importReport}
      <form action={importVideos}>
        <label className="f" htmlFor="video-urls">Adressen</label>
        <textarea
          className="f"
          id="video-urls"
          name="urls"
          rows={7}
          style={{ fontFamily: "var(--mono)", fontSize: 13 }}
          placeholder={"# Cloud Community\nhttps://www.youtube.com/watch?v=… | 2024\nhttps://youtu.be/…\n\n# Konferenz XY\nhttps://www.youtube.com/watch?v=…"}
        />
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>
          Videos übernehmen
        </button>
      </form>

      <p className="eyebrow" style={{ marginTop: 28 }}>
        Vorhandene ({allVideos.length}
        {channel ? `, davon ${filteredVideos.length} bei „${channel}“` : ""})
      </p>

      {channels.length > 1 ? (
        <div className="filter-row" style={{ marginTop: 4, marginBottom: 12 }}>
          <Link className="btn ghost sm" href={videoHref({ kanal: "" })} aria-current={channel === "" ? "true" : undefined}>
            Alle Kanäle ({allVideos.length})
          </Link>{" "}
          {channels.map((c) => (
            <span key={c}>
              <Link className="btn ghost sm" href={videoHref({ kanal: c })} aria-current={channel === c ? "true" : undefined}>
                {c} ({allVideos.filter((v) => v.publisher === c).length})
              </Link>{" "}
            </span>
          ))}
        </div>
      ) : null}

      {filteredVideos.length === 0 ? (
        <p className="muted">
          Noch keine Videos. Oben eine Handvoll Adressen einfügen — der Rest kommt von selbst.
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="media-table">
              <thead>
                <tr>
                  <th style={{ width: 132 }}>Vorschau</th>
                  <th>Titel</th>
                  <th style={{ width: 190 }}>Kanal</th>
                  <th style={{ width: 70 }}>Jahr</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {videosOnPage.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.coverUrl ? (
                        <AssetImage
                          compact
                          aiLabel="KI"
                          src={v.coverUrl}
                          alt={v.coverAlt}
                          ai={v.coverAi}
                          imgStyle={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }}
                        />
                      ) : (
                        <span className="meta">kein Bild</span>
                      )}
                    </td>
                    <td>
                      <b>{v.title}</b>
                      {v.url ? (
                        <div className="meta" style={{ wordBreak: "break-all" }}>
                          <a href={v.url} target="_blank" rel="noopener noreferrer">
                            Auf YouTube ansehen ↗
                          </a>
                        </div>
                      ) : null}
                      {!v.videoId ? (
                        <div className="meta" style={{ color: "var(--warn)" }}>
                          Keine YouTube-Kennung in der Adresse — dieses Video erscheint nicht auf der Website.
                        </div>
                      ) : null}
                    </td>
                    <td className="meta">{v.publisher ?? "—"}</td>
                    <td className="meta">{v.year}</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      {v.videoId ? (
                        <form action={refreshVideoThumbnail} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={v.id} />
                          <button className="btn ghost sm" type="submit">
                            {v.coverUrl ? "Bild erneuern" : "Bild holen"}
                          </button>
                        </form>
                      ) : null}{" "}
                      <Link className="btn ghost sm" href={`/admin/publikationen/bearbeiten?pub=${v.id}`}>
                        Bearbeiten
                      </Link>{" "}
                      <form action={deletePublication} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={v.id} />
                        <ConfirmButton confirmText={`„${v.title}" wirklich löschen?`}>Löschen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {videoPage.pageCount > 1 ? (
            <div className="filter-row" style={{ marginTop: 14 }}>
              <span className="meta" style={{ marginRight: 10 }}>
                {videoPage.from}–{videoPage.to} von {videoPage.total}
              </span>
              {pageWindow(videoPage.page, videoPage.pageCount).map((n, i) =>
                n === null ? (
                  <span key={`luecke-${i}`} className="meta" style={{ padding: "0 6px" }}>…</span>
                ) : (
                  <span key={n}>
                    <Link
                      className="btn ghost sm"
                      href={videoHref({ seite: n })}
                      aria-current={n === videoPage.page ? "page" : undefined}
                    >
                      {n}
                    </Link>{" "}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  const tabs: TabDef[] = PUB_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    badge: pubs.filter((p) => p.type === t.id).length,
    content: (
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        <div>
          <p className="eyebrow">Neuer Eintrag</p>
          {form(t.id, t.singular)}
        </div>
        <div>
          <p className="eyebrow">Vorhandene ({pubs.filter((p) => p.type === t.id).length})</p>
          {list(t.id)}
        </div>
      </div>
    ),
  }));

  tabs.push({ id: "videos", label: "Videos", badge: allVideos.length, content: videoTab });

  return (
    <section>
      <h1>Publikationen</h1>
      <p className="muted">Bücher, Fachartikel, Whitepaper, Kurse und Videos: je Art links anlegen, rechts verwalten.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <Tabs tabs={tabs} initialId={sp.tab === "videos" ? "videos" : undefined} />
      </div>
    </section>
  );
}
