import Link from "next/link";
import { db } from "@/lib/db";
import { getBriefingRanking } from "@/lib/queries/briefings";
import { getShareTemplates, getShareProfiles } from "@/lib/queries/settings";
import { renderShareText, sharePublicPath } from "@/lib/share";
import { identityDisplayName } from "@/lib/identities";
import { formatDate, formatDuration } from "@/lib/format";
import { talkArchiveState } from "@/lib/briefings/archive";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import RichTextField from "@/components/admin/editor/RichTextField";
import Flash from "@/components/admin/Flash";
import SharePanel from "@/components/admin/SharePanel";
import {
  createTalkCategory,
  renameTalkCategory,
  deleteTalkCategory,
  createTalkAudience,
  renameTalkAudience,
  deleteTalkAudience,
  createTalk,
  deleteTalk,
  toggleTalkVisibility,
  toggleTalkArchive,
  reorderTalk,
  mergeTalks,
  mergeTalkCategory,
} from "./actions";

export const metadata = { title: "Briefings · Zentrale" };

// Phase 5.1: Tabs statt Endlosformular. Aktiver Tab in der URL (?tab=…), damit
// er beim Reload und Teilen erhalten bleibt. Die Tab-Leiste ist server-gerendert
// (Links) — keine Client-Komponente nötig.
const TABS = [
  { id: "neu", label: "Neues Briefing" },
  { id: "alle", label: "Alle Briefings" },
  { id: "auswertung", label: "Auswertung" },
  { id: "kategorien", label: "Kategorien" },
  { id: "zielgruppen", label: "Zielgruppen" },
] as const;

export default async function BriefingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    von?: string;
    bis?: string;
    ok?: string;
    err?: string;
    q?: string;
    kategorie?: string;
    sichtbar?: string;
  }>;
}) {
  const { tab, von, bis, ok, err, q, kategorie, sichtbar } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "alle";
  const term = (q ?? "").trim().toLowerCase();
  const categoryFilter = (kategorie ?? "").trim();
  const visibilityFilter =
    sichtbar === "ja" || sichtbar === "nein" || sichtbar === "archiv" ? sichtbar : "";
  const isFiltered = term !== "" || categoryFilter !== "" || visibilityFilter !== "";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [templates, shareProfiles] = await Promise.all([getShareTemplates(), getShareProfiles()]);

  let categories: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let audienceTags: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let talks: { id: string; title: string; categoryIds: string[]; category: string; audience: string; level: string | null; durationMin: number | null; deliveries: number; active: boolean; archivedAt: Date | null; share: { textDe: string; textEn: string } | null }[] = [];
  let dbError = false;
  try {
    const [cats, auds, talkRows] = await Promise.all([
      db.taxonomy.findMany({ where: { kind: "TALK" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { talkMulti: true } } } }),
      db.taxonomy.findMany({ where: { kind: "AUDIENCE" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { talkAudiences: true } } } }),
      db.talk.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { translations: true, categories: true, audiences: true, identities: { select: { codenameDe: true, codenameEn: true, roleDe: true, roleEn: true } }, _count: { select: { deliveries: true } } } }),
    ]);
    categories = cats.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.talkMulti }));
    audienceTags = auds.map((a) => ({ id: a.id, nameDe: a.nameDe, nameEn: a.nameEn, count: a._count.talkAudiences }));
    talks = talkRows.map((t) => {
      const de = t.translations.find((x) => x.locale === "de");
      const en = t.translations.find((x) => x.locale === "en");
      const names = t.identities.map((i) => identityDisplayName(i, "de"));
      const title = de?.title ?? "(ohne Titel)";
      // Briefings haben keine eigene öffentliche Detailseite → Link auf die
      // Briefings-Übersicht. Teilen nur für aktive Briefings mit Titel.
      const share =
        t.active && !t.archivedAt && de?.title
          ? {
              textDe: renderShareText(templates.briefing.de, { title, url: base + sharePublicPath("briefing", "de", null), identities: names }, "de"),
              textEn: renderShareText(templates.briefing.en, { title: en?.title ?? title, url: base + sharePublicPath("briefing", "en", null), identities: names }, "en"),
            }
          : null;
      return {
        id: t.id,
        title,
        categoryIds: t.categories.map((c) => c.id),
        category: t.categories.map((c) => c.nameDe).join(", ") || "—",
        audience: t.audiences.map((a) => a.nameDe).join(", ") || "—",
        level: t.level,
        durationMin: t.durationMin,
        deliveries: t._count.deliveries,
        active: t.active,
        archivedAt: t.archivedAt,
        share,
      };
    });
  } catch {
    dbError = true;
  }

  // Filter wirken nur auf die Anzeige; die Reihenfolge-Pfeile beziehen sich
  // weiter auf die vollständige Liste (sonst würde Sortieren im Filter irren).
  const visibleTalks = talks.filter((t) => {
    if (term && !t.title.toLowerCase().includes(term)) return false;
    if (categoryFilter && !t.categoryIds.includes(categoryFilter)) return false;
    const state = talkArchiveState(t);
    if (visibilityFilter === "ja" && state !== "active") return false;
    if (visibilityFilter === "nein" && state !== "hidden") return false;
    if (visibilityFilter === "archiv" && state !== "archived") return false;
    // Ohne ausdrücklichen Archiv-Filter bleibt das Archiv außen vor — sonst
    // steht Abgelegtes zwischen dem, was noch gehalten wird.
    if (visibilityFilter === "" && state === "archived") return false;
    return true;
  });

  const ranking =
    active === "auswertung"
      ? await getBriefingRanking("de", {
          from: von ? new Date(`${von}T00:00:00Z`) : undefined,
          to: bis ? new Date(`${bis}T00:00:00Z`) : undefined,
        })
      : [];

  return (
    <section>
      <h1>Briefings verwalten</h1>
      <p className="muted">Repertoire, Kategorien und die Auswertung, welche Vorträge gefragt sind.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <a key={t.id} role="tab" aria-selected={t.id === active} className={`tab${t.id === active ? " active" : ""}`} href={`/admin/briefings?tab=${t.id}`}>
            {t.label}
          </a>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        {active === "alle" ? (
          <div className="card bracket">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Alle Briefings</p>
              <Link className="btn solid sm" href="/admin/briefings/bearbeiten" style={{ marginLeft: "auto" }}>+ Neues Briefing</Link>
            </div>

            <form method="get" className="list-filter" role="search">
              <input type="hidden" name="tab" value="alle" />
              <label className="f">
                Suche
                <input className="f" type="search" name="q" defaultValue={q ?? ""} placeholder="Titel …" style={{ minWidth: 220 }} />
              </label>
              <label className="f">
                Kategorie
                <select className="f" name="kategorie" defaultValue={categoryFilter} style={{ minWidth: 170 }}>
                  <option value="">Alle</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nameDe}</option>)}
                </select>
              </label>
              <label className="f">
                Auf Website
                <select className="f" name="sichtbar" defaultValue={visibilityFilter} style={{ minWidth: 140 }}>
                  <option value="">Aktuelle (ohne Archiv)</option>
                  <option value="ja">Sichtbar</option>
                  <option value="nein">Verborgen</option>
                  <option value="archiv">Archiv</option>
                </select>
              </label>
              <button className="btn solid sm" type="submit">Filtern</button>
              {isFiltered ? <Link className="btn ghost sm" href="/admin/briefings?tab=alle">Zurücksetzen</Link> : null}
              <span className="meta">{visibleTalks.length} von {talks.length}</span>
            </form>

            {visibleTalks.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                {talks.length === 0
                  ? "Noch keine Briefings im Repertoire."
                  : "Kein Briefing passt zu dieser Auswahl. Filter lockern oder zurücksetzen."}
              </p>
            ) : (
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr><th style={{ width: 60 }}>Reihenf.</th><th>Titel</th><th>Kategorie</th><th>Zielgruppe</th><th>Einsätze</th><th>Zustand</th><th></th></tr>
                </thead>
                <tbody>
                  {visibleTalks.map((t) => {
                    const i = talks.findIndex((x) => x.id === t.id);
                    return (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <form action={reorderTalk} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button className="btn ghost sm" type="submit" aria-label="Nach oben" disabled={i === 0}>↑</button>
                        </form>{" "}
                        <form action={reorderTalk} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="dir" value="down" />
                          <button className="btn ghost sm" type="submit" aria-label="Nach unten" disabled={i === talks.length - 1}>↓</button>
                        </form>
                      </td>
                      <td><b>{t.title}</b>{t.level || t.durationMin ? <div className="meta">{[t.level ? `Level ${t.level}` : null, t.durationMin ? formatDuration(t.durationMin, "de") : null].filter(Boolean).join(" · ")}</div> : null}</td>
                      <td className="meta">{t.category}</td>
                      <td className="meta">{t.audience}</td>
                      <td>{t.deliveries}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {t.archivedAt ? (
                          <span className="st" title={`Archiviert am ${formatDate(t.archivedAt, "de")}`}>
                            Archiv · {formatDate(t.archivedAt, "de")}
                          </span>
                        ) : (
                          <form action={toggleTalkVisibility} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="btn ghost sm" type="submit" title="Sichtbarkeit auf der Website umschalten">
                              {t.active ? "Sichtbar ✓" : "Verborgen"}
                            </button>
                          </form>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {t.share ? (
                          <>
                            <SharePanel title={t.title} textDe={t.share.textDe} textEn={t.share.textEn} profiles={shareProfiles} />{" "}
                          </>
                        ) : null}
                        <Link className="btn ghost sm" href={`/admin/briefings/bearbeiten?id=${t.id}`}>Bearbeiten</Link>{" "}
                        <form action={toggleTalkArchive} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="btn ghost sm" type="submit">
                            {t.archivedAt ? "Zurückholen" : "Archivieren"}
                          </button>
                        </form>{" "}
                        <form action={deleteTalk} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmButton confirmText={`Briefing „${t.title}“ wirklich löschen? Auch die Einsatz-Zählung geht verloren.`}>Löschen</ConfirmButton>
                        </form>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Dubletten entstehen beim Import immer wieder: derselbe Titel mit
                geschütztem Bindestrich (Audit 4.2) oder dieselbe Session je
                Sprache als eigenes Briefing (Audit 4.3). */}
            <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginTop: 0 }}>Briefings zusammenführen</p>
              <p className="meta" style={{ marginTop: -6 }}>
                Das erste gibt seine Einsätze, fehlende Sprachfassungen und Verknüpfungen an das
                zweite ab und wandert danach ins Archiv. Ein gepflegter Titel des Ziels bleibt
                stehen. Behalte das Briefing mit den meisten Einsätzen.
              </p>
              <form action={mergeTalks} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label className="meta" htmlFor="talk-merge-source">Von</label>
                <select className="f" id="talk-merge-source" name="sourceId" style={{ maxWidth: 320 }} required>
                  <option value="">— wählen —</option>
                  {talks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.deliveries}×)</option>
                  ))}
                </select>
                <label className="meta" htmlFor="talk-merge-target">nach</label>
                <select className="f" id="talk-merge-target" name="targetId" style={{ maxWidth: 320 }} required>
                  <option value="">— wählen —</option>
                  {talks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.deliveries}×)</option>
                  ))}
                </select>
                <ConfirmButton confirmText="Briefings zusammenführen? Das erste wandert danach ins Archiv.">
                  Zusammenführen
                </ConfirmButton>
              </form>
            </div>
          </div>
        ) : null}

        {active === "neu" ? (
          <div className="card bracket">
            <p className="eyebrow">Neues Briefing (Schnellanlage)</p>
            <form action={createTalk} style={{ maxWidth: 560 }}>
              <label className="f">Titel (DE)</label>
              <input className="f" name="deTitle" placeholder="z. B. Agents in Produktion" required />
              <label className="f">Titel (EN)</label>
              <input className="f" name="enTitle" placeholder="e. g. Agents in production" />
              <label className="f">Vortragsinhalt (DE)</label>
              <RichTextField name="deAbstract" ariaLabel="Vortragsinhalt DE" />
              <label className="f">Kategorien (Mehrfachauswahl)</label>
              <CategoryMultiSelect name="categoryIds" options={categories.map((c) => ({ id: c.id, name: c.nameDe }))} emptyHint="Erst eine Kategorie anlegen (Tab „Kategorien“)." />
              <label className="f">Zielgruppe (Mehrfachauswahl)</label>
              <CategoryMultiSelect name="audienceIds" options={audienceTags.map((a) => ({ id: a.id, name: a.nameDe }))} emptyHint="Optional: erst eine Zielgruppe anlegen (Tab „Zielgruppen“)." />
              <label className="f">Level</label>
              <input className="f" name="level" placeholder="300" />
              <label className="f">Dauer (Minuten)</label>
              <input className="f" name="durationMin" type="number" placeholder="45" />
              <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>Briefing anlegen</button>
            </form>
          </div>
        ) : null}

        {active === "kategorien" ? (
          <div className="card bracket">
            <p className="eyebrow">Kategorien</p>
            <table>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <form action={renameTalkCategory} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <input className="f" name="nameDe" defaultValue={c.nameDe} style={{ maxWidth: 160 }} aria-label="Name DE" />
                        <input className="f" name="nameEn" defaultValue={c.nameEn} style={{ maxWidth: 160 }} aria-label="Name EN" />
                        <button className="btn ghost sm" type="submit">Umbenennen</button>
                      </form>
                    </td>
                    <td className="meta">{c.count} Briefings</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <form action={deleteTalkCategory} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton confirmText={`Kategorie „${c.nameDe}“ löschen?`}>Löschen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={createTalkCategory} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input className="f" name="name" placeholder="Neue Kategorie" style={{ maxWidth: 220 }} />
              <button className="btn ghost sm" type="submit">+ Kategorie anlegen</button>
            </form>

            {/* Belegte Kategorien lassen sich nicht löschen. Zum Aufräumen der
                Taxonomie (Audit 4.5) braucht es deshalb das Überführen. */}
            <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginTop: 0 }}>Kategorie überführen</p>
              <p className="meta" style={{ marginTop: -6 }}>
                Alle Briefings der ersten Kategorie bekommen die zweite, danach wird die erste
                gelöscht. Nichts geht verloren.
              </p>
              <form action={mergeTalkCategory} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label className="meta" htmlFor="cat-merge-source">Von</label>
                <select className="f" id="cat-merge-source" name="sourceId" style={{ maxWidth: 240 }} required>
                  <option value="">— wählen —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameDe} ({c.count})</option>
                  ))}
                </select>
                <label className="meta" htmlFor="cat-merge-target">nach</label>
                <select className="f" id="cat-merge-target" name="targetId" style={{ maxWidth: 240 }} required>
                  <option value="">— wählen —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameDe} ({c.count})</option>
                  ))}
                </select>
                <ConfirmButton confirmText="Kategorie überführen und die alte löschen?">Überführen</ConfirmButton>
              </form>
            </div>
          </div>
        ) : null}

        {active === "zielgruppen" ? (
          <div className="card bracket">
            <p className="eyebrow">Zielgruppen</p>
            <p className="meta" style={{ marginTop: 0 }}>Wiederverwendbare Tags: einmal anlegen, an beliebig vielen Briefings nutzen.</p>
            <table>
              <tbody>
                {audienceTags.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <form action={renameTalkAudience} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <input type="hidden" name="id" value={a.id} />
                        <input className="f" name="nameDe" defaultValue={a.nameDe} style={{ maxWidth: 160 }} aria-label="Name DE" />
                        <input className="f" name="nameEn" defaultValue={a.nameEn} style={{ maxWidth: 160 }} aria-label="Name EN" />
                        <button className="btn ghost sm" type="submit">Umbenennen</button>
                      </form>
                    </td>
                    <td className="meta">{a.count} Briefings</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <form action={deleteTalkAudience} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton confirmText={`Zielgruppe „${a.nameDe}“ löschen?`}>Löschen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={createTalkAudience} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input className="f" name="name" placeholder="z. B. Entscheider:innen" style={{ maxWidth: 220 }} />
              <button className="btn ghost sm" type="submit">+ Zielgruppe anlegen</button>
            </form>
          </div>
        ) : null}

        {active === "auswertung" ? (
          <div className="card bracket">
            <p className="eyebrow">Auswertung · beliebteste Briefings</p>
            <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <input type="hidden" name="tab" value="auswertung" />
              <span className="meta">Zeitraum</span>
              <input className="f" type="date" name="von" defaultValue={von ?? ""} style={{ maxWidth: 170 }} aria-label="von" />
              <span className="meta">bis</span>
              <input className="f" type="date" name="bis" defaultValue={bis ?? ""} style={{ maxWidth: 170 }} aria-label="bis" />
              <button className="btn sm" type="submit">Auswerten</button>
            </form>
            <table>
              <thead>
                <tr><th>#</th><th>Briefing</th><th>Einsätze</th><th>DE</th><th>EN</th><th>Zuletzt</th></tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.talkId}>
                    <td className="mono" style={{ color: "var(--violet-bright)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td><b>{r.title}</b></td>
                    <td>{r.total}</td>
                    <td>{r.de}</td>
                    <td>{r.en}</td>
                    <td className="meta">{r.lastHeld ? formatDate(r.lastHeld, "de") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
