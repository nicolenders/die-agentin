import Link from "next/link";
import { db } from "@/lib/db";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatDate } from "@/lib/format";
import { identityDisplayName } from "@/lib/identities";
import { deleteDispatch } from "./actions";

export const metadata = { title: "Depeschen · Zentrale" };

interface Row {
  id: string;
  title: string;
  format: string;
  status: string;
  publishedAt: Date | null;
  identities: { name: string; color: string }[];
}

export default async function DepeschenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let rows: Row[] = [];
  let dbError = false;
  try {
    const list = await db.dispatch.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { translations: { where: { locale: "de" } }, identities: true },
    });
    rows = list.map((d) => ({
      id: d.id,
      title: d.translations[0]?.title ?? "(ohne Titel)",
      format: d.format,
      status: d.status,
      publishedAt: d.publishedAt,
      identities: d.identities.map((i) => ({ name: identityDisplayName(i, "de"), color: i.color })),
    }));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Depeschen</h1>
      <p className="muted">Signale und Dossiers in einer Entität. Format ist ein Filter, keine eigene Rubrik. Jede Depesche gehört zu einer Identität.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <p style={{ marginTop: 16 }}>
        <Link className="btn solid sm" href="/admin/depeschen/bearbeiten">+ Neue Depesche</Link>
      </p>

      {rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>Noch keine Depesche. Die erste anlegen.</p>
        </div>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>Titel</th><th>Format</th><th>Identität(en)</th><th>Status</th><th>Datum</th><th style={{ textAlign: "right" }}>Aktionen</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.title}</b></td>
                <td className="meta">{r.format}</td>
                <td className="meta">
                  {r.identities.map((i) => (
                    <span key={i.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                      {i.name}
                    </span>
                  ))}
                </td>
                <td><span className={`st ${r.status === "PUBLISHED" ? "live" : "sched"}`} style={{ display: "inline-block" }}>{r.status}</span></td>
                <td className="meta">{formatDate(r.publishedAt, "de")}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <Link className="btn ghost sm" href={`/admin/depeschen/bearbeiten?id=${r.id}`}>Bearbeiten</Link>{" "}
                  <form action={deleteDispatch} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton confirmText={`„${r.title}" wirklich löschen?`}>Löschen</ConfirmButton>
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
