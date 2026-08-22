import Link from "next/link";
import { db } from "@/lib/db";
import Flash from "@/components/admin/Flash";
import { updateFocusTopic } from "../../publikationen/actions";

export const metadata = { title: "Radar-Thema · Zentrale" };

// Bearbeiten eines Radar-Themas auf eigener Seite — wie bei Publikationen und
// Ausbildung. Die Übersicht bleibt damit eine Übersicht und wird nicht zu
// einer Reihe aufgeklappter Formulare.
export default async function RadarBearbeitenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; err?: string }>;
}) {
  const { id, err } = await searchParams;

  const back = (
    <div style={{ marginBottom: 12 }}>
      <Link className="btn ghost sm" href="/admin/aufklaerung">← Zurück zum Radar</Link>
    </div>
  );

  if (!id) {
    return <section>{back}<p className="muted">Kein Thema ausgewählt.</p></section>;
  }

  const row = await db.focusTopic.findUnique({
    where: { id },
    include: { _count: { select: { dispatches: true, identities: true } } },
  });
  if (!row) {
    return <section>{back}<p className="st">Thema nicht gefunden.</p></section>;
  }

  return (
    <section>
      {back}
      <h1>{row.titleDe}</h1>
      <Flash err={err} />
      <p className="muted">
        {row._count.dispatches === 0
          ? "Noch keine Depesche verknüpft — öffentlich bleibt der Radar-Punkt damit ohne Link."
          : `${row._count.dispatches} ${row._count.dispatches === 1 ? "Depesche" : "Depeschen"} verknüpft.`}
        {row._count.identities > 0
          ? ` Bei ${row._count.identities} ${row._count.identities === 1 ? "Identität" : "Identitäten"} hinterlegt.`
          : ""}
      </p>

      <div className="card bracket" style={{ marginTop: 16, maxWidth: 620 }}>
        <form action={updateFocusTopic}>
          <input type="hidden" name="id" value={row.id} />
          <label className="f" htmlFor="titleDe">Thema (DE)</label>
          <input className="f" id="titleDe" name="titleDe" defaultValue={row.titleDe} required />
          <label className="f" htmlFor="titleEn">Thema (EN, optional)</label>
          <input className="f" id="titleEn" name="titleEn" defaultValue={row.titleEn ?? ""} />
          <label className="f" htmlFor="note">Notiz (optional)</label>
          <input className="f" id="note" name="note" defaultValue={row.note ?? ""} placeholder="Kurzer Kontext, z. B. Vortragsthema" />

          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginTop: 14 }}>
            <span>
              <label className="f" htmlFor="sortOrder" style={{ display: "inline" }}>Reihenfolge</label>{" "}
              <input id="sortOrder" name="sortOrder" type="number" defaultValue={row.sortOrder} style={{ width: 90 }} />
            </span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="active" defaultChecked={row.active} />
              Auf dem Radar zeigen
            </label>
          </div>

          <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>Speichern</button>
        </form>
      </div>
    </section>
  );
}
