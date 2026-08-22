import Link from "next/link";
import { db } from "@/lib/db";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import Tabs, { type TabDef } from "@/components/admin/Tabs";
import { createFocusTopic, deleteFocusTopic } from "../publikationen/actions";

export const metadata = { title: "Aufklärung · Zentrale" };

interface FocusRow {
  id: string;
  titleDe: string;
  titleEn: string | null;
  note: string | null;
  active: boolean;
  sortOrder: number;
  dispatchCount: number;
}

export default async function AufklaerungAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let focus: FocusRow[] = [];
  let dbError = false;
  try {
    const rows = await db.focusTopic.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { dispatches: true } } },
    });
    focus = rows.map((f) => ({
      id: f.id,
      titleDe: f.titleDe,
      titleEn: f.titleEn,
      note: f.note,
      active: f.active,
      sortOrder: f.sortOrder,
      dispatchCount: f._count.dispatches,
    }));
  } catch {
    dbError = true;
  }

  const list = (rows: FocusRow[], emptyText: string) => {
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>{emptyText}</p>;
    return (
      <table style={{ marginTop: 4 }}>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>
                <b>{f.titleDe}</b>
                <div className="meta">
                  {[
                    f.titleEn || null,
                    f.dispatchCount === 0
                      ? "noch keine Depesche"
                      : `${f.dispatchCount} ${f.dispatchCount === 1 ? "Depesche" : "Depeschen"}`,
                    f.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </td>
              <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                <Link className="btn ghost sm" href={`/admin/aufklaerung/bearbeiten?id=${f.id}`}>Bearbeiten</Link>{" "}
                <form action={deleteFocusTopic} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={f.id} />
                  <ConfirmButton confirmText={`Thema „${f.titleDe}" vom Radar nehmen?`}>Löschen</ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const form = (
    <form action={createFocusTopic}>
      <p className="meta" style={{ marginTop: 0 }}>
        Ein neues Thema erscheint sofort in der Depeschen-Maske und bei den Identitäten als
        Auswahl. Öffentlich anklickbar wird es, sobald eine veröffentlichte Depesche daran hängt.
      </p>
      <label className="f" htmlFor="new-titleDe">Thema (DE)</label>
      <input className="f" id="new-titleDe" name="titleDe" placeholder="z. B. Agentische KI mit Copilot Studio" required />
      <label className="f" htmlFor="new-titleEn">Thema (EN, optional)</label>
      <input className="f" id="new-titleEn" name="titleEn" />
      <label className="f" htmlFor="new-note">Notiz (optional)</label>
      <input className="f" id="new-note" name="note" placeholder="Kurzer Kontext, z. B. Vortragsthema" />
      <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ Auf den Radar setzen</button>
    </form>
  );

  const active = focus.filter((f) => f.active);
  const resting = focus.filter((f) => !f.active);

  const tabs: TabDef[] = [
    {
      id: "aktiv",
      label: "Auf dem Radar",
      badge: active.length,
      content: (
        <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
          <div>
            <p className="eyebrow">Neues Thema</p>
            {form}
          </div>
          <div>
            <p className="eyebrow">Auf dem Radar ({active.length})</p>
            {list(active, "Noch nichts auf dem Radar. Das erste Thema links eintragen.")}
          </div>
        </div>
      ),
    },
    {
      id: "ruht",
      label: "Ruht",
      badge: resting.length,
      content: (
        <div style={{ marginTop: 12 }}>
          <p className="meta" style={{ marginTop: 0 }}>
            Ausgeblendete Themen. Sie bleiben mit ihren Depeschen und Identitäten verknüpft und
            lassen sich jederzeit wieder auf den Radar holen.
          </p>
          {list(resting, "Nichts ausgeblendet.")}
        </div>
      ),
    },
  ];

  return (
    <section>
      <h1>Aufklärung</h1>
      <p className="muted">
        Themen auf dem Radar: was ich gerade beobachte, einarbeite und als Nächstes in Briefings
        einfließen lasse. Muss nicht zu einer Zertifizierung führen. Erscheint öffentlich unter
        Ausbildung.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <Tabs tabs={tabs} />
      </div>
    </section>
  );
}
