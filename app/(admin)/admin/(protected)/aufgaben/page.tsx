import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { formatDate } from "@/lib/format";
import { getMissionTasks, type TaskItem } from "@/lib/queries/tasks";
import {
  TASK_VIEWS,
  TASK_VIEW_LABEL,
  countTaskViews,
  filterTasks,
  isOverdue,
  sortTasks,
  toTaskView,
} from "@/lib/tasks/filter";
import { completeMissionReport, reopenMissionReport } from "./actions";

export const metadata = { title: "Aufgaben · Zentrale" };
export const dynamic = "force-dynamic";

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const view = toTaskView(sp.ansicht);
  const now = new Date();

  let tasks: TaskItem[] = [];
  let dbError = false;
  try {
    tasks = await getMissionTasks();
  } catch {
    dbError = true;
  }

  const counts = countTaskViews(tasks, now);
  const shown = sortTasks(filterTasks(tasks, view, now));
  const back = `/admin/aufgaben?ansicht=${view}`;

  return (
    <section>
      <h1>Aufgaben</h1>
      <p className="muted">
        Zu jedem Einsatz gehört ein Einsatzbericht. Hier stehen sie alle — abhaken lässt sich
        einer, sobald im Einsatz die Texte zur Veranstaltung und zum Vortrag stehen.
      </p>
      <Flash ok={sp.ok} err={dbError ? "failed" : sp.err} />

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TASK_VIEWS.map((v) => (
          <a
            key={v}
            role="tab"
            aria-selected={v === view}
            className={`tab${v === view ? " active" : ""}`}
            href={`/admin/aufgaben?ansicht=${v}`}
          >
            {TASK_VIEW_LABEL[v]}
            <span className="tab-count">{counts[v]}</span>
          </a>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            {view === "offen"
              ? "Keine offene Aufgabe. Jeder Einsatz hat seinen Bericht."
              : view === "ueberfaellig"
                ? "Nichts überfällig. Die offenen Berichte gehören zu Einsätzen, die noch bevorstehen."
                : view === "erledigt"
                  ? "Noch nichts abgehakt."
                  : "Noch keine Aufgaben. Sie entstehen mit jedem Einsatz."}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ marginTop: 18 }}>
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th>Einsatz</th>
                <th>Ort</th>
                <th>Einsatztag</th>
                <th>Es fehlt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => {
                const overdue = isOverdue(t, now);
                return (
                  <tr key={t.id}>
                    <td style={{ textAlign: "center" }}>
                      <span
                        aria-hidden
                        title={t.status === "DONE" ? "Erledigt" : overdue ? "Überfällig" : "Offen"}
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background:
                            t.status === "DONE"
                              ? "var(--ok)"
                              : overdue
                                ? "var(--warn)"
                                : "var(--violet-bright)",
                        }}
                      />
                    </td>
                    <td>
                      <Link href={t.editHref}><b>{t.eventName}</b></Link>
                      {t.status === "DONE" && t.doneAt ? (
                        <div className="meta">Abgehakt am {formatDate(t.doneAt, "de")}</div>
                      ) : null}
                    </td>
                    <td className="meta">{t.isOnline ? "Online" : t.city}</td>
                    <td className="meta" style={{ whiteSpace: "nowrap" }}>
                      {formatDate(t.dueOn, "de")}
                      {overdue ? <b style={{ color: "var(--warn)" }}> überfällig</b> : null}
                    </td>
                    <td className="meta">
                      {t.status === "DONE"
                        ? "—"
                        : t.missing.length > 0
                          ? t.missing.join(", ")
                          : t.photosMissing
                            ? "nichts — Bilder wären noch schön"
                            : "nichts"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Link className="btn ghost sm" href={t.editHref}>Bericht schreiben</Link>{" "}
                      {t.status === "DONE" ? (
                        <form action={reopenMissionReport} style={{ display: "inline" }}>
                          <input type="hidden" name="missionId" value={t.missionId} />
                          <input type="hidden" name="back" value={back} />
                          <button className="btn ghost sm" type="submit">Wieder öffnen</button>
                        </form>
                      ) : (
                        <form action={completeMissionReport} style={{ display: "inline" }}>
                          <input type="hidden" name="missionId" value={t.missionId} />
                          <input type="hidden" name="back" value={back} />
                          <button
                            className="btn solid sm"
                            type="submit"
                            disabled={!t.complete}
                            title={
                              t.complete
                                ? "Einsatzbericht als erledigt markieren"
                                : `Erst ergänzen: ${t.missing.join(", ")}`
                            }
                          >
                            Erledigt
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
