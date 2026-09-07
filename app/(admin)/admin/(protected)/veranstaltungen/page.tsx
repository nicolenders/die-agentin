import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import { listEventSeries, type EventSeriesRow } from "@/lib/queries/event-series";
import { editionRange } from "@/lib/events/naming";
import { formatDate } from "@/lib/format";
import {
  createEventSeries,
  deleteEventEdition,
  deleteEventSeries,
  mergeEventSeries,
  saveEventEdition,
  updateEventSeries,
} from "./actions";

export const metadata = { title: "Veranstaltungen · Zentrale" };

// Stammdaten der Veranstaltungen: Name, Veranstalter, Website — und die Chronik
// der Ausgaben. Die Einsätze selbst stehen weiter unter „Einsätze"; hier steht
// nur das, was über die Jahre gleich bleibt.

export default async function VeranstaltungenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let series: EventSeriesRow[] = [];
  let dbError = false;
  try {
    series = await listEventSeries();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1 style={{ margin: 0 }}>Veranstaltungen</h1>
      <p className="muted">
        Die Klammer um wiederkehrende Einsätze: Was jedes Jahr gleich bleibt — Name, Veranstalter,
        Website — steht hier, der einzelne Auftritt steht im Einsatz. Die Website wird beim Anlegen
        eines Einsatzes übernommen; ändert sie sich später, behalten alte Einsätze ihre Adresse.
      </p>
      <Flash ok={ok} err={err} />

      {dbError ? (
        <p className="muted">Die Datenbank ist gerade nicht erreichbar. Bitte später erneut versuchen.</p>
      ) : null}

      <div className="card bracket" style={{ marginTop: 16 }}>
        <p className="eyebrow">Neue Veranstaltung</p>
        <form action={createEventSeries} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="f">
            Name
            <input className="f" name="name" required placeholder="z. B. TechDay" style={{ minWidth: 220 }} />
          </label>
          <label className="f">
            Veranstalter (optional)
            <input className="f" name="organizer" placeholder="z. B. Community Verein e. V." style={{ minWidth: 220 }} />
          </label>
          <label className="f">
            Website (optional)
            <input className="f" name="websiteUrl" type="url" placeholder="https://…" style={{ minWidth: 220 }} />
          </label>
          <button className="btn solid sm" type="submit">+ Anlegen</button>
        </form>
      </div>

      {series.length === 0 && !dbError ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            Noch keine Veranstaltung. Leg die erste an — danach lässt sie sich in jedem Einsatz
            auswählen, und die Einsätze bei derselben Veranstaltung gehören sichtbar zusammen.
          </p>
        </div>
      ) : null}

      {series.map((s) => (
        <div key={s.id} className="card bracket" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <p className="eyebrow" style={{ margin: 0 }}>{s.name}</p>
            <span className="meta">
              {s.missionCount === 1 ? "1 Einsatz" : `${s.missionCount} Einsätze`}
              {s.lastMissionAt ? ` · zuletzt ${formatDate(s.lastMissionAt, "de")}` : ""}
            </span>
            {s.missionCount > 0 ? (
              <Link className="btn ghost sm" href={`/admin/einsaetze?veranstaltung=${s.id}`} style={{ marginLeft: "auto" }}>
                Einsätze zeigen
              </Link>
            ) : null}
          </div>

          <form action={updateEventSeries} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <input type="hidden" name="id" value={s.id} />
            <label className="f">
              Name
              <input className="f" name="name" defaultValue={s.name} required style={{ minWidth: 200 }} />
            </label>
            <label className="f">
              Veranstalter
              <input className="f" name="organizer" defaultValue={s.organizer ?? ""} style={{ minWidth: 200 }} />
            </label>
            <label className="f">
              Website (Stammdaten)
              <input className="f" name="websiteUrl" type="url" defaultValue={s.websiteUrl ?? ""} placeholder="https://…" style={{ minWidth: 220 }} />
            </label>
            <button className="btn ghost sm" type="submit">Speichern</button>
          </form>

          <p className="eyebrow" style={{ marginTop: 18 }}>Ausgaben</p>
          {s.editions.length === 0 ? (
            <p className="meta" style={{ marginTop: 0 }}>
              Noch keine Ausgabe. Trag unten ein, wann die Veranstaltung stattfand — oder setz die
              Daten direkt im Einsatz, dann entsteht die Ausgabe dort.
            </p>
          ) : (
            <table>
              <tbody>
                {s.editions.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <form action={saveEventEdition} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="hidden" name="seriesId" value={s.id} />
                        <input type="hidden" name="editionId" value={e.id} />
                        <input
                          className="f"
                          name="label"
                          defaultValue={e.label}
                          aria-label={`Bezeichnung der Ausgabe ${e.label}`}
                          style={{ maxWidth: 130 }}
                        />
                        <input
                          className="f"
                          type="date"
                          name="startDate"
                          defaultValue={e.startDate ? e.startDate.toISOString().slice(0, 10) : ""}
                          aria-label={`Beginn der Ausgabe ${e.label}`}
                          style={{ maxWidth: 170 }}
                        />
                        <input
                          className="f"
                          type="date"
                          name="endDate"
                          defaultValue={e.endDate ? e.endDate.toISOString().slice(0, 10) : ""}
                          aria-label={`Ende der Ausgabe ${e.label}`}
                          style={{ maxWidth: 170 }}
                        />
                        <button className="btn ghost sm" type="submit">Speichern</button>
                      </form>
                    </td>
                    <td className="meta">
                      {editionRange(e.startDate, e.endDate, "de") || "ohne Datum"}
                      {" · "}
                      {e.missionCount === 1 ? "1 Einsatz" : `${e.missionCount} Einsätze`}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <form action={deleteEventEdition} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={e.id} />
                        <ConfirmButton confirmText={`Ausgabe „${e.label}“ löschen? Die Einsätze bleiben erhalten.`}>
                          Löschen
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form action={saveEventEdition} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <input type="hidden" name="seriesId" value={s.id} />
            <label className="f">
              Bezeichnung (optional)
              <input className="f" name="label" placeholder="Jahr der Ausgabe" style={{ maxWidth: 170 }} />
            </label>
            <label className="f">
              Beginn
              <input className="f" type="date" name="startDate" required style={{ maxWidth: 170 }} />
            </label>
            <label className="f">
              Ende (optional)
              <input className="f" type="date" name="endDate" style={{ maxWidth: 170 }} />
            </label>
            <button className="btn ghost sm" type="submit">+ Ausgabe</button>
          </form>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 18 }}>
            {series.length > 1 ? (
              <form action={mergeEventSeries} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                <input type="hidden" name="sourceId" value={s.id} />
                <label className="f">
                  Zusammenführen mit
                  <select className="f" name="targetId" defaultValue="" style={{ minWidth: 200 }}>
                    <option value="" disabled>Ziel wählen …</option>
                    {series.filter((t) => t.id !== s.id).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
                <ConfirmButton
                  confirmText={`„${s.name}“ in die gewählte Veranstaltung überführen? Einsätze und Ausgaben ziehen um, „${s.name}“ verschwindet.`}
                >
                  Überführen
                </ConfirmButton>
              </form>
            ) : null}
            <form action={deleteEventSeries} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="id" value={s.id} />
              <ConfirmButton
                confirmText={`Veranstaltung „${s.name}“ löschen? Die ${s.missionCount} zugeordneten Einsätze bleiben bestehen und verlieren nur die Zuordnung.`}
              >
                Löschen
              </ConfirmButton>
            </form>
          </div>
        </div>
      ))}
    </section>
  );
}
