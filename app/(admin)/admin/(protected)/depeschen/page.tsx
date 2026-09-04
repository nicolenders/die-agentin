import Link from "next/link";
import { db } from "@/lib/db";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SharePanel from "@/components/admin/SharePanel";
import { formatDate } from "@/lib/format";
import { identityDisplayName } from "@/lib/identities";
import { CONTENT_STATUSES, DISPATCH_FORMATS, isOneOf, type ContentStatus, type DispatchFormat } from "@/lib/domain";
import { getShareTemplates, getShareProfiles } from "@/lib/queries/settings";
import { renderShareText, sharePublicPath } from "@/lib/share";
import { RETURN_PARAM, editHref, withParams } from "@/lib/admin/return-to";
import { deleteDispatch } from "./actions";

export const metadata = { title: "Depeschen · Zentrale" };

interface Row {
  id: string;
  title: string;
  format: string;
  status: string;
  publishedAt: Date | null;
  identities: { name: string; color: string }[];
  topics: string[];
  share: { textDe: string; textEn: string } | null;
}

export default async function DepeschenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; q?: string; status?: string; format?: string }>;
}) {
  const { ok, err, q, status, format } = await searchParams;
  const term = (q ?? "").trim();
  const statusFilter: ContentStatus | "" = isOneOf(CONTENT_STATUSES, status ?? "") ? (status as ContentStatus) : "";
  const formatFilter: DispatchFormat | "" = isOneOf(DISPATCH_FORMATS, format ?? "") ? (format as DispatchFormat) : "";
  const isFiltered = term !== "" || statusFilter !== "" || formatFilter !== "";
  // Die Ansicht, in der Nicole gerade steht. Sie reist mit in die Maske und
  // bringt sie beim Zurückgehen wieder in genau diese gefilterte Liste.
  const listHref = withParams("/admin/depeschen", {
    q: term || undefined,
    status: statusFilter || undefined,
    format: formatFilter || undefined,
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [templates, shareProfiles] = await Promise.all([getShareTemplates(), getShareProfiles()]);

  let rows: Row[] = [];
  let total = 0;
  let dbError = false;
  try {
    const [list, count] = await Promise.all([
      db.dispatch.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(formatFilter ? { format: formatFilter } : {}),
          ...(term
            ? { translations: { some: { OR: [{ title: { contains: term } }, { summary: { contains: term } }] } } }
            : {}),
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: { translations: true, identities: true, focusTopics: { select: { titleDe: true } } },
      }),
      db.dispatch.count(),
    ]);
    total = count;
    rows = list.map((d) => {
      const de = d.translations.find((t) => t.locale === "de");
      const en = d.translations.find((t) => t.locale === "en");
      const names = d.identities.map((i) => identityDisplayName(i, "de"));
      // Teilen nur für veröffentlichte Depeschen mit öffentlichem Slug.
      const share =
        d.status === "PUBLISHED" && de?.slug
          ? {
              textDe: renderShareText(
                templates.dispatch.de,
                { title: de.title, url: base + sharePublicPath("dispatch", "de", de.slug), identities: names },
                "de",
              ),
              textEn: renderShareText(
                templates.dispatch.en,
                {
                  title: en?.title ?? de.title,
                  url: base + sharePublicPath("dispatch", "en", en?.slug ?? de.slug),
                  identities: names,
                },
                "en",
              ),
            }
          : null;
      return {
        id: d.id,
        title: de?.title ?? "(ohne Titel)",
        format: d.format,
        status: d.status,
        publishedAt: d.publishedAt,
        identities: d.identities.map((i) => ({ name: identityDisplayName(i, "de"), color: i.color })),
        topics: d.focusTopics.map((t) => t.titleDe),
        share,
      };
    });
  } catch {
    dbError = true;
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Depeschen</h1>
        <Link className="btn solid sm" href="/admin/depeschen/bearbeiten" style={{ marginLeft: "auto" }}>+ Neue Depesche</Link>
      </div>
      <p className="muted">Signale und Dossiers in einer Entität. Format ist ein Filter, keine eigene Rubrik. Jede Depesche gehört zu einer Identität.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <form method="get" className="list-filter" role="search">
        <label className="f">
          Suche
          <input className="f" type="search" name="q" defaultValue={term} placeholder="Titel oder Kurzfassung …" style={{ minWidth: 240 }} />
        </label>
        <label className="f">
          Status
          <select className="f" name="status" defaultValue={statusFilter} style={{ minWidth: 150 }}>
            <option value="">Alle</option>
            {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="f">
          Format
          <select className="f" name="format" defaultValue={formatFilter} style={{ minWidth: 150 }}>
            <option value="">Alle</option>
            {DISPATCH_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <button className="btn solid sm" type="submit">Filtern</button>
        {isFiltered ? <Link className="btn ghost sm" href="/admin/depeschen">Zurücksetzen</Link> : null}
        {!dbError ? <span className="meta">{rows.length} von {total}</span> : null}
      </form>

      {rows.length === 0 && !dbError ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            {isFiltered
              ? "Keine Depesche passt zu dieser Auswahl. Filter lockern oder zurücksetzen."
              : "Noch keine Depesche. Die erste anlegen."}
          </p>
        </div>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>Titel</th><th>Format</th><th>Identität(en)</th><th>Radar-Thema</th><th>Status</th><th>Datum</th><th style={{ textAlign: "right" }}>Aktionen</th></tr>
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
                <td className="meta">{r.topics.length > 0 ? r.topics.join(", ") : "—"}</td>
                <td><span className={`st ${r.status === "PUBLISHED" ? "live" : "sched"}`} style={{ display: "inline-block" }}>{r.status}</span></td>
                <td className="meta">{formatDate(r.publishedAt, "de")}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {r.share ? (
                    <>
                      <SharePanel title={r.title} textDe={r.share.textDe} textEn={r.share.textEn} profiles={shareProfiles} />{" "}
                    </>
                  ) : null}
                  <Link className="btn ghost sm" href={editHref("/admin/depeschen/bearbeiten", r.id, listHref)}>Bearbeiten</Link>{" "}
                  <form action={deleteDispatch} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name={RETURN_PARAM} value={listHref} />
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
