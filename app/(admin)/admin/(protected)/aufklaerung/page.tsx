import { db } from "@/lib/db";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import { createFocusTopic, updateFocusTopic, deleteFocusTopic } from "../publikationen/actions";

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

  return (
    <section>
      <h1>Aufklärung</h1>
      <p className="muted">
        Themen auf dem Radar: was ich gerade beobachte, einarbeite und als Nächstes in Briefings
        einfließen lasse. Muss nicht zu einer Zertifizierung führen. Erscheint öffentlich unter
        Ausbildung; anklickbar wird ein Punkt, sobald eine veröffentlichte Depesche daran hängt.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20, maxWidth: 620 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Neues Radar-Thema</p>
        <form action={createFocusTopic}>
          <label className="f" htmlFor="new-titleDe">Thema (DE)</label>
          <input className="f" id="new-titleDe" name="titleDe" placeholder="z. B. Agentische KI mit Copilot Studio" required />
          <label className="f" htmlFor="new-titleEn">Thema (EN, optional)</label>
          <input className="f" id="new-titleEn" name="titleEn" />
          <label className="f" htmlFor="new-note">Notiz (optional)</label>
          <input className="f" id="new-note" name="note" placeholder="Kurzer Kontext, z. B. Vortragsthema" />
          <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>+ Auf den Radar setzen</button>
        </form>
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Auf dem Radar ({focus.length})</p>
      {focus.length === 0 ? (
        <div className="card bracket">
          <p className="muted" style={{ margin: 0 }}>
            Noch nichts auf dem Radar. Das erste Thema oben eintragen — es taucht danach in der
            Depeschen-Maske und bei den Identitäten als Auswahl auf.
          </p>
        </div>
      ) : (
        focus.map((f) => (
          <div className="card bracket" key={f.id} style={{ marginBottom: 14, maxWidth: 620 }}>
            {/* Bearbeiten statt löschen und neu anlegen: die Verknüpfungen zu
                Depeschen und Identitäten hängen an der ID. */}
            <form action={updateFocusTopic}>
              <input type="hidden" name="id" value={f.id} />
              <div className="grid g2" style={{ gap: 12, alignItems: "start" }}>
                <div>
                  <label className="f" htmlFor={`titleDe-${f.id}`}>Thema (DE)</label>
                  <input className="f" id={`titleDe-${f.id}`} name="titleDe" defaultValue={f.titleDe} required />
                </div>
                <div>
                  <label className="f" htmlFor={`titleEn-${f.id}`}>Thema (EN, optional)</label>
                  <input className="f" id={`titleEn-${f.id}`} name="titleEn" defaultValue={f.titleEn ?? ""} />
                </div>
              </div>
              <label className="f" htmlFor={`note-${f.id}`}>Notiz (optional)</label>
              <input className="f" id={`note-${f.id}`} name="note" defaultValue={f.note ?? ""} />

              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
                <span>
                  <label className="f" htmlFor={`sortOrder-${f.id}`} style={{ display: "inline" }}>Reihenfolge</label>{" "}
                  <input id={`sortOrder-${f.id}`} name="sortOrder" type="number" defaultValue={f.sortOrder} style={{ width: 90 }} />
                </span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="active" defaultChecked={f.active} />
                  Auf dem Radar zeigen
                </label>
                <span className="meta">
                  {f.dispatchCount === 0
                    ? "Noch keine Depesche verknüpft"
                    : `${f.dispatchCount} ${f.dispatchCount === 1 ? "Depesche" : "Depeschen"}`}
                </span>
                <button className="btn solid sm" type="submit" style={{ marginLeft: "auto" }}>Speichern</button>
              </div>
            </form>
            <form action={deleteFocusTopic} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={f.id} />
              <ConfirmButton confirmText={`Thema „${f.titleDe}" vom Radar nehmen?`}>Entfernen</ConfirmButton>
            </form>
          </div>
        ))
      )}
    </section>
  );
}
