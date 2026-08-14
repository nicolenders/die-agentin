import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { ContentStatus } from "@/lib/domain";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import SharePanel from "@/components/admin/SharePanel";
import { identityDisplayName } from "@/lib/identities";
import { getShareTemplates, getShareProfiles, getLinkedInConnected } from "@/lib/queries/settings";
import { renderShareText, sharePublicPath } from "@/lib/share";
import { deleteMission } from "./actions";

export const metadata = { title: "Einsätze · Zentrale" };

const STATUS: Record<ContentStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "draft" },
  SCHEDULED: { label: "Eingeplant", cls: "sched" },
  PUBLISHED: { label: "Live", cls: "live" },
  ARCHIVED: { label: "Archiviert", cls: "" },
};

export default async function EinsaetzeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [templates, shareProfiles, linkedInConnected] = await Promise.all([
    getShareTemplates(),
    getShareProfiles(),
    getLinkedInConnected(),
  ]);

  let rows: Awaited<ReturnType<typeof load>> = [];
  let dbError = false;
  try {
    rows = await load(base, templates);
  } catch {
    dbError = true;
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Einsätze</h1>
        <Link className="btn solid sm" href="/admin/einsaetze/bearbeiten" style={{ marginLeft: "auto" }}>
          + Neuer Einsatz
        </Link>
      </div>
      <p className="muted">Vorträge, Konferenzen, Auftritte — mit Ort auf der Karte und Bezug zum Briefing.</p>
      <Flash ok={ok} err={err} />

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block", marginTop: 16 }}>Datenbank wird geweckt … einen Moment.</p>
      ) : rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          <p className="eyebrow">Noch keine Einsätze</p>
          <p className="muted">Trag deinen ersten Auftritt nach — er gehört auf die Karte.</p>
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Veranstaltung</th>
              <th>Ort</th>
              <th>Datum</th>
              <th>Status</th>
              <th>Sprachen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const st = STATUS[m.contentStatus] ?? STATUS.DRAFT;
              return (
                <tr key={m.id}>
                  <td><b>{m.eventName}</b></td>
                  <td className="meta">{m.city}{m.countryCode ? `, ${m.countryCode}` : ""}</td>
                  <td className="meta">{formatDate(m.startDate, "de")}</td>
                  <td><span className={`st ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <span className={`lng ${m.hasDe ? "on" : ""}`}>DE</span>{" "}
                    <span className={`lng ${m.hasEn ? "on" : ""}`}>EN</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {m.share ? (
                      <>
                        <SharePanel title={m.eventName} textDe={m.share.textDe} textEn={m.share.textEn} profiles={shareProfiles} linkedInConnected={linkedInConnected} />{" "}
                      </>
                    ) : null}
                    <Link className="btn ghost sm" href={`/admin/einsaetze/bearbeiten?id=${m.id}`}>Bearbeiten</Link>{" "}
                    <form action={deleteMission} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmButton confirmText={`Einsatz „${m.eventName}" wirklich löschen?`}>Löschen</ConfirmButton>
                    </form>
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

async function load(base: string, templates: Awaited<ReturnType<typeof getShareTemplates>>) {
  const missions = await db.mission.findMany({
    orderBy: { startDate: "desc" },
    include: {
      translations: { select: { locale: true, slug: true } },
      identities: { select: { codenameDe: true, codenameEn: true, roleDe: true, roleEn: true } },
    },
    take: 200,
  });
  return missions.map((m) => {
    const de = m.translations.find((t) => t.locale === "de");
    const en = m.translations.find((t) => t.locale === "en");
    const names = m.identities.map((i) => identityDisplayName(i, "de"));
    // Teilen nur für veröffentlichte Einsätze mit öffentlichem Slug.
    const share =
      m.contentStatus === "PUBLISHED" && de?.slug
        ? {
            textDe: renderShareText(
              templates.mission.de,
              {
                title: m.eventName,
                url: base + sharePublicPath("mission", "de", de.slug),
                identities: names,
                city: m.city,
                date: formatDate(m.startDate, "de"),
              },
              "de",
            ),
            textEn: renderShareText(
              templates.mission.en,
              {
                title: m.eventName,
                url: base + sharePublicPath("mission", "en", en?.slug ?? de.slug),
                identities: names,
                city: m.city,
                date: formatDate(m.startDate, "en"),
              },
              "en",
            ),
          }
        : null;
    return {
      id: m.id,
      eventName: m.eventName,
      city: m.city,
      countryCode: m.countryCode,
      startDate: m.startDate,
      contentStatus: m.contentStatus as ContentStatus,
      hasDe: m.translations.some((t) => t.locale === "de"),
      hasEn: m.translations.some((t) => t.locale === "en"),
      share,
    };
  });
}
