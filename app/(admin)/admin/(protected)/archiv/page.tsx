import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatDate } from "@/lib/format";
import { getArchivedEntries, type PlanKind } from "@/lib/queries/planning";
import { restoreEntry, purgeEntry } from "./actions";

export const metadata = { title: "Archiv · Zentrale" };

const TABS: { id: PlanKind; label: string }[] = [
  { id: "dispatch", label: "Depeschen" },
  { id: "mission", label: "Einsätze" },
];

export default async function ArchivPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; err?: string }>;
}) {
  const { tab, ok, err } = await searchParams;
  const active: PlanKind = tab === "mission" ? "mission" : "dispatch";

  let entries: Awaited<ReturnType<typeof getArchivedEntries>> = [];
  let dbError = false;
  try {
    entries = await getArchivedEntries(active);
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Archiv</h1>
      <p className="muted">Archivierte Einträge bleiben vollständig erhalten, erscheinen aber nicht öffentlich. Wiederherstellen setzt zurück auf „Entwurf“.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <a key={t.id} role="tab" aria-selected={t.id === active} className={`tab${t.id === active ? " active" : ""}`} href={`/admin/archiv?tab=${t.id}`}>
            {t.label}
          </a>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>Nichts archiviert.</p>
        </div>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>Titel</th><th>Identität(en)</th><th>Datum</th><th style={{ textAlign: "right" }}>Aktionen</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td><b>{e.title}</b></td>
                <td className="meta">{e.identities.map((i) => i.name).join(", ")}</td>
                <td className="meta">{formatDate(e.date, "de")}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <form action={restoreEntry} style={{ display: "inline" }}>
                    <input type="hidden" name="kind" value={e.kind} />
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn ghost sm" type="submit">Wiederherstellen</button>
                  </form>{" "}
                  <form action={purgeEntry} style={{ display: "inline" }}>
                    <input type="hidden" name="kind" value={e.kind} />
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton confirmText={`„${e.title}" endgültig löschen? Das kann nicht rückgängig gemacht werden.`}>Endgültig löschen</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
