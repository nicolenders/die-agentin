import Link from "next/link";
import AssetImage from "@/components/media/AssetImage";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import { getIdentitiesAdmin, type IdentityAdminRow } from "@/lib/queries/identities";
import { identityDisplayName } from "@/lib/identities";
import { deleteIdentity, reorderIdentity, togglePublishIdentity } from "./actions";

export const metadata = { title: "Identitäten · Zentrale" };

export default async function IdentitaetenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let rows: IdentityAdminRow[] = [];
  let dbError = false;
  try {
    rows = await getIdentitiesAdmin();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Identitäten</h1>
      <p className="muted">
        Nicoles Decknamen, parallel und dauerhaft aktiv, keine Chronologie. Jede Identität ist ein Objekt mit Inhalt
        („Umschlag“), kein Etikett. Reihenfolge ist manuell.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <p style={{ marginTop: 16 }}>
        <Link className="btn solid sm" href="/admin/identitaeten/bearbeiten">
          + Neue Identität
        </Link>
      </p>

      {rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>Noch keine Identität angelegt. Leg die erste an. Sie trägt später die ganze Startseite.</p>
        </div>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 52 }}></th>
              <th>Deckname / Rolle</th>
              <th>Farbe</th>
              <th>Verknüpft</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>
                  {r.portraitUrl ? (
                    <AssetImage compact aiLabel="KI" src={r.portraitUrl} alt={r.codenameDe || r.roleDe} imgStyle={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  ) : (
                    <span aria-hidden style={{ display: "inline-block", width: 40, height: 40, borderRadius: 4, background: r.color, opacity: 0.5 }} />
                  )}
                </td>
                <td>
                  <b>{identityDisplayName({ codenameDe: r.codenameDe, codenameEn: "", roleDe: r.roleDe, roleEn: "" }, "de")}</b>
                  {r.codenameDe ? <div className="meta">{r.roleDe}</div> : <div className="meta">Deckname fehlt (fällt auf Rolle zurück)</div>}
                  {r.isPrimary ? <span className="meta"> · hervorgehoben</span> : null}
                </td>
                <td>
                  <span aria-hidden style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: r.color, verticalAlign: "middle", marginRight: 6 }} />
                  <span className="meta" style={{ fontFamily: "var(--mono)" }}>{r.color}</span>
                </td>
                <td className="meta">
                  {r.counts.missions}E · {r.counts.talks}B · {r.counts.publications}P · {r.counts.certifications}Z
                </td>
                <td>
                  <span className={`st ${r.published ? "live" : ""}`} style={{ display: "inline-block" }}>
                    {r.published ? "Veröffentlicht" : "Entwurf"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <form action={reorderIdentity} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button className="btn ghost sm" type="submit" aria-label="Nach oben" disabled={i === 0}>↑</button>
                  </form>{" "}
                  <form action={reorderIdentity} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button className="btn ghost sm" type="submit" aria-label="Nach unten" disabled={i === rows.length - 1}>↓</button>
                  </form>{" "}
                  <form action={togglePublishIdentity} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn ghost sm" type="submit">{r.published ? "Zurückziehen" : "Veröffentlichen"}</button>
                  </form>{" "}
                  <Link className="btn ghost sm" href={`/admin/identitaeten/bearbeiten?id=${r.id}`}>Bearbeiten</Link>{" "}
                  <form action={deleteIdentity} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton confirmText={`„${r.codenameDe || r.roleDe}" wirklich löschen? Nur ohne verknüpfte Einträge möglich.`}>Löschen</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="meta" style={{ marginTop: 10 }}>Legende: E = Einsätze, B = Briefings, P = Publikationen, Z = Zertifizierungen.</p>
    </section>
  );
}
