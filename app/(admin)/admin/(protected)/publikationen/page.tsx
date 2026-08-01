import { db } from "@/lib/db";
import { createPublication, createCertification } from "./actions";

export const metadata = { title: "Publikationen & Ausbildung · Zentrale" };

export default async function RecordsAdminPage() {
  let pubs: { id: string; title: string; meta: string }[] = [];
  let certCats: { id: string; nameDe: string }[] = [];
  let dbError = false;
  try {
    const [pubRows, cats] = await Promise.all([
      db.publication.findMany({ orderBy: { year: "desc" }, include: { translations: { where: { locale: "de" } } } }),
      db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" } }),
    ]);
    pubs = pubRows.map((p) => ({
      id: p.id,
      title: p.translations[0]?.title ?? "(ohne Titel)",
      meta: `${p.type} · ${p.year}${p.translations[0]?.role ? ` · ${p.translations[0]?.role}` : ""}`,
    }));
    certCats = cats.map((c) => ({ id: c.id, nameDe: c.nameDe }));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Publikationen &amp; Ausbildung</h1>
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card bracket">
          <p className="eyebrow">Publikationen</p>
          <table>
            <tbody>
              {pubs.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.title}</b>
                    <div className="meta">{p.meta}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="eyebrow" style={{ marginTop: 16 }}>Neue Publikation</p>
          <form action={createPublication}>
            <label className="f">Titel (DE)</label>
            <input className="f" name="deTitle" placeholder="Titel" />
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
            <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ Publikation anlegen</button>
          </form>
        </div>

        <div className="card bracket">
          <p className="eyebrow">Zertifizierung / Auszeichnung</p>
          <form action={createCertification}>
            <label className="f">Kategorie</label>
            <select className="f" name="categoryId">
              {certCats.map((c) => (
                <option key={c.id} value={c.id}>{c.nameDe}</option>
              ))}
            </select>
            <label className="f">Bezeichnung</label>
            <input className="f" name="name" placeholder="z. B. Azure AI Engineer Associate" />
            <label className="f">Kürzel</label>
            <input className="f" name="shortCode" placeholder="AI-102" />
            <label className="f">Erworben am</label>
            <input className="f" name="acquiredOn" type="month" />
            <label className="f">Gültig bis (optional)</label>
            <input className="f" name="validUntil" type="month" />
            <label className="f">Reihe (Mehrfachauszeichnung, z. B. MVP)</label>
            <input className="f" name="series" placeholder="MVP" />
            <label className="f">Nachweis-Link (optional)</label>
            <input className="f" name="proofUrl" placeholder="https://…" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>Speichern</button>
          </form>
        </div>
      </div>
    </section>
  );
}
