import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { PostType, ContentStatus } from "@/lib/domain";

export const metadata = { title: "Alle Beiträge · Zentrale" };

const STATUS_LABEL: Record<ContentStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "draft" },
  SCHEDULED: { label: "Eingeplant", cls: "sched" },
  PUBLISHED: { label: "Veröffentlicht", cls: "live" },
  ARCHIVED: { label: "Archiviert", cls: "" },
};

const TYPE_LABEL: Record<PostType, string> = {
  SIGNAL: "Signal",
  NOTE: "Kurzmeldung",
  BACKSTAGE: "Backstage",
};

export default async function BeitraegePage() {
  let posts: Awaited<ReturnType<typeof loadPosts>> = [];
  let dbError = false;
  try {
    posts = await loadPosts();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Alle Beiträge</h1>
        <Link className="btn solid sm" href="/admin/editor" style={{ marginLeft: "auto" }}>
          + Neuer Beitrag
        </Link>
      </div>

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block", marginTop: 16 }}>
          Datenbank wird geweckt … einen Moment.
        </p>
      ) : posts.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          <p className="eyebrow">Noch keine Beiträge</p>
          <p className="muted">Leg deinen ersten Beitrag an — der erste Fund wartet sicher schon.</p>
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Datum</th>
              <th>Sprachen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.DRAFT;
              return (
                <tr key={p.id}>
                  <td>
                    <b>{p.title}</b>
                  </td>
                  <td className="meta">{TYPE_LABEL[p.type]}</td>
                  <td>
                    <span className={`st ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="meta">{formatDateTime(p.date, "de")}</td>
                  <td>
                    <span className={`lng ${p.hasDe ? "on" : ""}`}>DE</span>{" "}
                    <span className={`lng ${p.hasEn ? "on" : ""}`}>EN</span>
                  </td>
                  <td>
                    <Link className="btn ghost sm" href={`/admin/editor?id=${p.id}`}>
                      Bearbeiten
                    </Link>
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

async function loadPosts() {
  const posts = await db.post.findMany({
    orderBy: { updatedAt: "desc" },
    include: { translations: { select: { locale: true, title: true } } },
    take: 100,
  });
  return posts.map((p) => {
    const de = p.translations.find((t) => t.locale === "de");
    return {
      id: p.id,
      type: p.type as PostType,
      status: p.status as ContentStatus,
      date: p.publishAt ?? p.publishedAt ?? p.updatedAt,
      title: de?.title ?? p.translations[0]?.title ?? "(ohne Titel)",
      hasDe: p.translations.some((t) => t.locale === "de"),
      hasEn: p.translations.some((t) => t.locale === "en"),
    };
  });
}
