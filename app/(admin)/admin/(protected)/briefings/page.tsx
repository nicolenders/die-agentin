import { db } from "@/lib/db";
import { getBriefingRanking } from "@/lib/queries/briefings";
import { formatDate } from "@/lib/format";
import { createTalkCategory, renameTalkCategory, createTalk } from "./actions";

export const metadata = { title: "Briefings · Zentrale" };

export default async function BriefingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { von, bis } = await searchParams;

  let categories: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let dbError = false;
  try {
    const cats = await db.taxonomy.findMany({
      where: { kind: "TALK" },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { talks: true } } },
    });
    categories = cats.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.talks }));
  } catch {
    dbError = true;
  }

  const ranking = await getBriefingRanking("de", {
    from: von ? new Date(`${von}T00:00:00Z`) : undefined,
    to: bis ? new Date(`${bis}T00:00:00Z`) : undefined,
  });

  return (
    <section>
      <h1>Briefings verwalten</h1>
      <p className="muted">Repertoire, Kategorien und die Auswertung, welche Vorträge gefragt sind.</p>

      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20 }}>
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
                </tr>
              ))}
            </tbody>
          </table>
          <form action={createTalkCategory} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input className="f" name="name" placeholder="Neue Kategorie" style={{ maxWidth: 220 }} />
            <button className="btn ghost sm" type="submit">+ Kategorie anlegen</button>
          </form>
        </div>

        <div className="card bracket">
          <p className="eyebrow">Neues Briefing</p>
          <form action={createTalk}>
            <label className="f">Titel (DE)</label>
            <input className="f" name="deTitle" placeholder="z. B. Agents in Produktion" />
            <label className="f">Titel (EN)</label>
            <input className="f" name="enTitle" placeholder="e. g. Agents in production" />
            <label className="f">Kategorie</label>
            <select className="f" name="categoryId" required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameDe}</option>
              ))}
            </select>
            <label className="f">Level</label>
            <input className="f" name="level" placeholder="300" />
            <label className="f">Dauer (Minuten)</label>
            <input className="f" name="durationMin" type="number" placeholder="45" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>Briefing anlegen</button>
          </form>
        </div>
      </div>

      <div className="card bracket" style={{ marginTop: 16 }}>
        <p className="eyebrow">Auswertung · beliebteste Briefings</p>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
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
    </section>
  );
}
