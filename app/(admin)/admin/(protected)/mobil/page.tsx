import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import Flash from "@/components/admin/Flash";
import { quickCapture } from "./actions";

export const metadata = { title: "Mobil erfassen · Zentrale" };

export default async function MobilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let drafts: { id: string; title: string; date: Date }[] = [];
  let dbError = false;
  try {
    const rows = await db.post.findMany({
      where: { status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { translations: { where: { locale: "de" }, select: { title: true } } },
    });
    drafts = rows.map((p) => ({ id: p.id, title: p.translations[0]?.title ?? "(ohne Titel)", date: p.updatedAt }));
  } catch {
    dbError = true;
  }

  return (
    <section style={{ maxWidth: 520 }}>
      <h1>Mobil erfassen</h1>
      <p className="muted">Schnell festhalten — den Feinschliff machst du später am Rechner im Editor.</p>
      <Flash ok={ok} err={err} />

      <div className="card bracket" style={{ marginTop: 16 }}>
        <form action={quickCapture}>
          <label className="f">Art</label>
          <select className="f" name="type" defaultValue="SIGNAL" style={{ fontSize: 16, padding: 12 }}>
            <option value="SIGNAL">Signal (Fundstück mit Link)</option>
            <option value="NOTE">Kurzmeldung</option>
            <option value="BACKSTAGE">Backstage</option>
          </select>
          <label className="f">Titel · Pflicht</label>
          <input className="f" name="title" placeholder="Worum geht’s?" style={{ fontSize: 16, padding: 12 }} required />
          <label className="f">Link (optional)</label>
          <input className="f" name="sourceUrl" type="url" inputMode="url" placeholder="https://…" style={{ fontSize: 16, padding: 12 }} />
          <label className="f">Notiz (optional)</label>
          <textarea className="f" name="text" rows={4} placeholder="Ein, zwei Sätze genügen." style={{ fontSize: 16, padding: 12 }} />
          <button className="btn solid" type="submit" style={{ marginTop: 14, width: "100%", padding: 14 }}>
            Als Entwurf sichern
          </button>
        </form>
      </div>

      <p className="eyebrow" style={{ marginTop: 24 }}>Zuletzt festgehalten</p>
      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : drafts.length === 0 ? (
        <p className="muted">Noch keine Entwürfe.</p>
      ) : (
        <div className="card bracket">
          <table>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id}>
                  <td>
                    <b>{d.title}</b>
                    <div className="meta">{formatDateTime(d.date, "de")}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost sm" href={`/admin/editor?id=${d.id}`}>Im Editor öffnen</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
