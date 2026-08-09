import { db } from "@/lib/db";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import { createFocusTopic, deleteFocusTopic } from "../publikationen/actions";

export const metadata = { title: "Aufklärung · Zentrale" };

export default async function AufklaerungAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let focus: { id: string; titleDe: string; titleEn: string | null; note: string | null }[] = [];
  let dbError = false;
  try {
    const rows = await db.focusTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    focus = rows.map((f) => ({ id: f.id, titleDe: f.titleDe, titleEn: f.titleEn, note: f.note }));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Aufklärung</h1>
      <p className="muted">
        Themen auf dem Radar — was ich gerade beobachte, einarbeite und als Nächstes in Briefings
        einfließen lasse. Muss nicht zu einer Zertifizierung führen. Erscheint öffentlich unter
        Ausbildung.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20, alignItems: "start" }}>
        <div className="card bracket">
          <p className="eyebrow">Neues Radar-Thema</p>
          <form action={createFocusTopic}>
            <label className="f">Thema (DE)</label>
            <input className="f" name="titleDe" placeholder="z. B. Agentische KI mit Copilot Studio" required />
            <label className="f">Thema (EN, optional)</label>
            <input className="f" name="titleEn" />
            <label className="f">Notiz (optional)</label>
            <input className="f" name="note" placeholder="Kurzer Kontext, z. B. Vortragsthema" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>+ Auf den Radar setzen</button>
          </form>
        </div>

        <div className="card bracket">
          <p className="eyebrow">Auf dem Radar ({focus.length})</p>
          {focus.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>Noch keine Themen erfasst.</p>
          ) : (
            <table style={{ marginTop: 4 }}>
              <tbody>
                {focus.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <b>{f.titleDe}</b>
                      {f.titleEn ? <span className="meta"> · {f.titleEn}</span> : null}
                      {f.note ? <div className="meta">{f.note}</div> : null}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <form action={deleteFocusTopic} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={f.id} />
                        <ConfirmButton confirmText={`Thema „${f.titleDe}" vom Radar nehmen?`}>Entfernen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
