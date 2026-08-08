import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import AssetPickerField from "@/components/admin/AssetPickerField";
import Flash from "@/components/admin/Flash";
import {
  createPublication,
  createCertification,
  deletePublication,
  deleteCertification,
} from "./actions";

export const metadata = { title: "Publikationen & Ausbildung · Zentrale" };

export default async function RecordsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let pubs: { id: string; title: string; meta: string }[] = [];
  let certs: { id: string; name: string; meta: string }[] = [];
  let certCats: { id: string; nameDe: string }[] = [];
  let dbError = false;
  try {
    const [pubRows, certRows, cats] = await Promise.all([
      db.publication.findMany({ orderBy: { year: "desc" }, include: { translations: { where: { locale: "de" } } } }),
      db.certification.findMany({ orderBy: { acquiredOn: "desc" }, include: { categories: true } }),
      db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" } }),
    ]);
    pubs = pubRows.map((p) => ({
      id: p.id,
      title: p.translations[0]?.title ?? "(ohne Titel)",
      meta: `${p.type} · ${p.year}${p.translations[0]?.role ? ` · ${p.translations[0]?.role}` : ""}`,
    }));
    certs = certRows.map((c) => ({
      id: c.id,
      name: c.name,
      meta: [c.shortCode, c.categories.map((x) => x.nameDe).join(", ") || null, formatDate(c.acquiredOn, "de")].filter(Boolean).join(" · "),
    }));
    certCats = cats.map((c) => ({ id: c.id, nameDe: c.nameDe }));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Publikationen &amp; Ausbildung</h1>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card bracket">
          <p className="eyebrow">Publikationen</p>
          {pubs.length === 0 ? (
            <p className="muted">Noch keine Publikationen erfasst.</p>
          ) : (
            <table>
              <tbody>
                {pubs.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.title}</b>
                      <div className="meta">{p.meta}</div>
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Link className="btn ghost sm" href={`/admin/publikationen/bearbeiten?pub=${p.id}`}>Bearbeiten</Link>{" "}
                      <form action={deletePublication} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton confirmText={`Publikation „${p.title}" wirklich löschen?`}>Löschen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="eyebrow" style={{ marginTop: 16 }}>Neue Publikation</p>
          <form action={createPublication}>
            <label className="f">Titel (DE)</label>
            <input className="f" name="deTitle" placeholder="Titel" required />
            <label className="f">Art</label>
            <select className="f" name="type">
              <option value="BOOK">Buch</option>
              <option value="ARTICLE">Fachartikel</option>
              <option value="WHITEPAPER">Whitepaper</option>
            </select>
            <label className="f">Jahr</label>
            <input className="f" name="year" type="number" defaultValue={2026} />
            <label className="f">Rolle (z. B. Co-Autorin)</label>
            <input className="f" name="role" />
            <label className="f">Verlag / Medium</label>
            <input className="f" name="publisher" />
            <label className="f">ISBN (optional)</label>
            <input className="f" name="isbn" />
            <label className="f">Link (optional)</label>
            <input className="f" name="url" placeholder="https://…" />
            <label className="f">Cover (optional)</label>
            <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="3 / 4" emptyHint="Kein Cover gewählt" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ Publikation anlegen</button>
          </form>
        </div>

        <div className="card bracket">
          <p className="eyebrow">Zertifizierungen &amp; Auszeichnungen</p>
          {certs.length === 0 ? (
            <p className="muted">Noch keine Zertifizierungen erfasst.</p>
          ) : (
            <table>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                      <div className="meta">{c.meta}</div>
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Link className="btn ghost sm" href={`/admin/publikationen/bearbeiten?cert=${c.id}`}>Bearbeiten</Link>{" "}
                      <form action={deleteCertification} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton confirmText={`„${c.name}" wirklich löschen?`}>Löschen</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="eyebrow" style={{ marginTop: 16 }}>Neue Zertifizierung / Auszeichnung</p>
          <form action={createCertification}>
            <label className="f">Kategorien (Mehrfachauswahl)</label>
            <select className="f" name="categoryIds" multiple size={Math.min(6, Math.max(3, certCats.length))} aria-label="Kategorien (Mehrfachauswahl)">
              {certCats.map((c) => (
                <option key={c.id} value={c.id}>{c.nameDe}</option>
              ))}
            </select>
            <p className="meta">Mehrere mit Strg/Cmd bzw. langem Tippen wählbar.</p>
            <label className="f">Bezeichnung</label>
            <input className="f" name="name" placeholder="z. B. Azure AI Engineer Associate" required />
            <label className="f">Kürzel</label>
            <input className="f" name="shortCode" placeholder="AI-102" />
            <label className="f">Erworben am</label>
            <input className="f" name="acquiredOn" type="month" required />
            <label className="f">Gültig bis (optional)</label>
            <input className="f" name="validUntil" type="month" />
            <label className="f">Reihe (Mehrfachauszeichnung, z. B. MVP)</label>
            <input className="f" name="series" placeholder="MVP" />
            <label className="f">Nachweis-Link (optional)</label>
            <input className="f" name="proofUrl" placeholder="https://…" />
            <label className="f">Logo (optional)</label>
            <AssetPickerField name="logoAssetId" initialAssetId={null} initialUrl={null} aspectRatio="1 / 1" objectFit="contain" emptyHint="Kein Logo gewählt" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ Zertifizierung anlegen</button>
          </form>
        </div>
      </div>
    </section>
  );
}
