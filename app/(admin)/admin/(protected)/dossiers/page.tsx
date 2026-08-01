import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { ContentStatus } from "@/lib/domain";

export const metadata = { title: "Dossiers · Zentrale" };

const STATUS: Record<ContentStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "draft" },
  SCHEDULED: { label: "Eingeplant", cls: "sched" },
  PUBLISHED: { label: "Live", cls: "live" },
  ARCHIVED: { label: "Archiviert", cls: "" },
};

export default async function DossiersAdminPage() {
  let rows: Awaited<ReturnType<typeof load>> = [];
  let dbError = false;
  try {
    rows = await load();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Dossiers</h1>
        <Link className="btn solid sm" href="/admin/dossiers/bearbeiten" style={{ marginLeft: "auto" }}>
          + Neues Dossier
        </Link>
      </div>
      <p className="muted">
        Langlebige Wissensseiten. Gleiche Bausteine wie Beiträge, zusätzlich
        Galerien, Videos und Inhaltsverzeichnis.
      </p>

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          <p className="eyebrow">Noch keine Dossiers</p>
          <p className="muted">Das erste Dossier wartet auf dich.</p>
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Kategorie</th>
              <th>Status</th>
              <th>Zuletzt aktualisiert</th>
              <th>Sprachen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const st = STATUS[d.status] ?? STATUS.DRAFT;
              return (
                <tr key={d.id}>
                  <td><b>{d.title}</b></td>
                  <td className="meta">{d.category ?? "—"}</td>
                  <td><span className={`st ${st.cls}`}>{st.label}</span></td>
                  <td className="meta">{formatDate(d.reviewedAt, "de")}</td>
                  <td>
                    <span className={`lng ${d.hasDe ? "on" : ""}`}>DE</span>{" "}
                    <span className={`lng ${d.enReviewed ? "on" : ""}`}>EN{d.enDraft ? " ✎" : ""}</span>
                  </td>
                  <td>
                    <Link className="btn ghost sm" href={`/admin/dossiers/bearbeiten?id=${d.id}`}>Bearbeiten</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

async function load() {
  const dossiers = await db.dossier.findMany({
    orderBy: { updatedAt: "desc" },
    include: { translations: { select: { locale: true, title: true, state: true } }, category: true },
    take: 100,
  });
  return dossiers.map((d) => {
    const de = d.translations.find((t) => t.locale === "de");
    const en = d.translations.find((t) => t.locale === "en");
    return {
      id: d.id,
      title: de?.title ?? d.translations[0]?.title ?? "(ohne Titel)",
      category: d.category?.nameDe ?? null,
      status: d.status as ContentStatus,
      reviewedAt: d.reviewedAt,
      hasDe: Boolean(de),
      enReviewed: en?.state === "REVIEWED",
      enDraft: en?.state === "AI_DRAFT",
    };
  });
}
