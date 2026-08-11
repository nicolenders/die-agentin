import Link from "next/link";
import { db } from "@/lib/db";
import { getBriefingRanking } from "@/lib/queries/briefings";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import RichTextField from "@/components/admin/editor/RichTextField";
import Flash from "@/components/admin/Flash";
import {
  createTalkCategory,
  renameTalkCategory,
  deleteTalkCategory,
  createTalkAudience,
  renameTalkAudience,
  deleteTalkAudience,
  createTalk,
  deleteTalk,
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
  searchParams: Promise<{ tab?: string; von?: string; bis?: string; ok?: string; err?: string }>;
}) {
  const { tab, von, bis, ok, err } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "alle";

  let categories: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let audienceTags: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let talks: { id: string; title: string; category: string; audience: string; level: string | null; durationMin: number | null; deliveries: number; active: boolean }[] = [];
  let dbError = false;
  try {
    const [cats, auds, talkRows] = await Promise.all([
      db.taxonomy.findMany({ where: { kind: "TALK" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { talkMulti: true } } } }),
      db.taxonomy.findMany({ where: { kind: "AUDIENCE" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { talkAudiences: true } } } }),
      db.talk.findMany({ orderBy: { createdAt: "desc" }, include: { translations: { where: { locale: "de" } }, categories: true, audiences: true, _count: { select: { deliveries: true } } } }),
    ]);
    categories = cats.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.talkMulti }));
    audienceTags = auds.map((a) => ({ id: a.id, nameDe: a.nameDe, nameEn: a.nameEn, count: a._count.talkAudiences }));
    talks = talkRows.map((t) => ({
      id: t.id,
      title: t.translations[0]?.title ?? "(ohne Titel)",
      category: t.categories.map((c) => c.nameDe).join(", ") || "—",
      audience: t.audiences.map((a) => a.nameDe).join(", ") || "—",
      level: t.level,
      durationMin: t.durationMin,
      deliveries: t._count.deliveries,
      active: t.active,
    }));
  } catch {
    dbError = true;
  }

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
            {talks.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>Noch keine Briefings im Repertoire.</p>
            ) : (
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>Titel</th><th>Kategorie</th><th>Zielgruppe</th><th>Level</th><th>Dauer</th><th>Einsätze</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {talks.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.title}</b></td>
                      <td className="meta">{t.category}</td>
                      <td className="meta">{t.audience}</td>
                      <td className="meta">{t.level ?? "—"}</td>
                      <td className="meta">{t.durationMin ? `${t.durationMin} min` : "—"}</td>
                      <td>{t.deliveries}</td>
                      <td><span className={`st ${t.active ? "live" : ""}`}>{t.active ? "Aktiv" : "Inaktiv"}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <Link className="btn ghost sm" href={`/admin/briefings/bearbeiten?id=${t.id}`}>Bearbeiten</Link>{" "}
                        <form action={deleteTalk} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmButton confirmText={`Briefing „${t.title}“ wirklich löschen? Auch die Einsatz-Zählung geht verloren.`}>Löschen</ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
              <CategoryMultiSelect name="audienceIds" options={audienceTags.map((a) => ({ id: a.id, name: a.nameDe }))} emptyHint="Optional — erst eine Zielgruppe anlegen (Tab „Zielgruppen“)." />
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
          </div>
        ) : null}

        {active === "zielgruppen" ? (
          <div className="card bracket">
            <p className="eyebrow">Zielgruppen</p>
            <p className="meta" style={{ marginTop: 0 }}>Wiederverwendbare Tags — einmal anlegen, an beliebig vielen Briefings nutzen.</p>
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
