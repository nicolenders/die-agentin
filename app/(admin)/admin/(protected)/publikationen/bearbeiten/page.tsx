import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import Flash from "@/components/admin/Flash";
import AssetPickerField from "@/components/admin/AssetPickerField";
import { updatePublication, savePublicationSales, deletePublicationSales } from "../actions";

export const metadata = { title: "Bearbeiten · Publikationen · Zentrale" };

export default async function PublicationEditPage({
  searchParams,
}: {
  searchParams: Promise<{ pub?: string; err?: string }>;
}) {
  const { pub, err } = await searchParams;

  const back = (
    <div style={{ marginBottom: 12 }}>
      <Link className="btn ghost sm" href="/admin/publikationen">← Zurück zur Übersicht</Link>
    </div>
  );

  if (!pub) {
    return <section>{back}<p className="muted">Kein Eintrag ausgewählt.</p></section>;
  }

  const row = await db.publication.findUnique({
    where: { id: pub },
    include: {
      translations: { where: { locale: "de" } },
      coverAsset: true,
      sales: { orderBy: { period: "desc" } },
    },
  });
  if (!row) {
    return <section>{back}<p className="st">Publikation nicht gefunden.</p></section>;
  }
  const de = row.translations[0];
  const coverUrl = row.coverAsset ? assetUrl(row.coverAsset.blobPath) : null;

  return (
    <section>
      {back}
      <h1>Publikation bearbeiten</h1>
      <Flash err={err} />
      {/* Bei Büchern stehen Stammdaten und Verkaufszahlen nebeneinander — beides
          gehört beim Nachtragen zusammen und passt so ohne Scrollen auf den Schirm. */}
      <div
        className="grid"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: row.type === "BOOK" ? "minmax(320px, 560px) minmax(320px, 620px)" : "minmax(320px, 560px)",
          gap: 16,
          alignItems: "start",
        }}
      >
      <div className="card bracket">
        <form action={updatePublication}>
          <input type="hidden" name="id" value={row.id} />
          <label className="f">Titel (DE)</label>
          <input className="f" name="deTitle" defaultValue={de?.title ?? ""} required />
          <label className="f">Art</label>
          <select className="f" name="type" defaultValue={row.type}>
            <option value="BOOK">Buch</option>
            <option value="ARTICLE">Fachartikel</option>
            <option value="WHITEPAPER">Whitepaper</option>
            <option value="COURSE">Kurs</option>
          </select>
          <label className="f">Jahr</label>
          <input className="f" name="year" type="number" defaultValue={row.year} />
          <label className="f">Rolle (z. B. Co-Autorin)</label>
          <input className="f" name="role" defaultValue={de?.role ?? ""} />
          <label className="f">{row.type === "COURSE" ? "Plattform" : "Verlag / Medium"}</label>
          <input className="f" name="publisher" defaultValue={row.publisher ?? ""} />
          <label className="f">ISBN (optional)</label>
          <input className="f" name="isbn" defaultValue={row.isbn ?? ""} />
          <label className="f">{row.type === "COURSE" ? "Link zum Kurs" : "Link (optional)"}</label>
          <input className="f" name="url" defaultValue={row.url ?? ""} placeholder="https://…" />
          <label className="f">{row.type === "COURSE" ? "Thumbnail (optional)" : "Cover (optional)"}</label>
          <AssetPickerField
            name="coverAssetId"
            initialAssetId={row.coverAssetId}
            initialUrl={coverUrl}
            aspectRatio={row.type === "COURSE" ? "16 / 9" : "3 / 4"}
            emptyHint={row.type === "COURSE" ? "Kein Thumbnail gewählt" : "Kein Cover gewählt"}
          />
          <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>Änderungen speichern</button>
        </form>
      </div>

      {row.type === "BOOK" ? (
        <div className="card bracket">
          <p className="eyebrow" style={{ marginTop: 0 }}>Verkaufszahlen (halbjährlich)</p>
          <p className="meta" style={{ marginTop: 0 }}>
            Je Halbjahr eintragen, wie viele Exemplare als gedruckte Version, als PDF und als
            Bundle (PDF + gedruckt) verkauft wurden. Öffentlich erscheinen die Summen:
            gedruckt = gedruckt + Bundle, PDF = PDF + Bundle. Retouren (zurückgegebene
            Exemplare) als negative Zahl eintragen — sie mindern die Summe.
          </p>

          {(() => {
            const printed = row.sales.reduce((s, x) => s + x.printedCount + x.bundleCount, 0);
            const pdf = row.sales.reduce((s, x) => s + x.pdfCount + x.bundleCount, 0);
            return row.sales.length > 0 ? (
              <p className="meta" style={{ marginTop: 0 }}>
                Aktuelle Summen: <b>{printed.toLocaleString("de-DE")}</b> gedruckt ·{" "}
                <b>{pdf.toLocaleString("de-DE")}</b> als PDF
              </p>
            ) : null;
          })()}

          {row.sales.length > 0 ? (
            <table style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Gedruckt</th>
                  <th>PDF</th>
                  <th>Bundle</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {row.sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.period}</td>
                    <td>{s.printedCount}</td>
                    <td>{s.pdfCount}</td>
                    <td>{s.bundleCount}</td>
                    <td>
                      <form action={deletePublicationSales}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="publicationId" value={row.id} />
                        <button className="btn ghost sm" type="submit">Entfernen</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <form action={savePublicationSales} style={{ marginTop: 12, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
            <input type="hidden" name="publicationId" value={row.id} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="f" style={{ margin: 0 }}>
                Periode
                <input className="f" name="period" placeholder="2024-H1" required style={{ maxWidth: 120 }} />
              </label>
              <label className="f" style={{ margin: 0 }}>
                Gedruckt
                <input className="f" name="printedCount" type="number" step={1} defaultValue={0} style={{ maxWidth: 100 }} />
              </label>
              <label className="f" style={{ margin: 0 }}>
                PDF
                <input className="f" name="pdfCount" type="number" step={1} defaultValue={0} style={{ maxWidth: 100 }} />
              </label>
              <label className="f" style={{ margin: 0 }}>
                Bundle
                <input className="f" name="bundleCount" type="number" step={1} defaultValue={0} style={{ maxWidth: 100 }} />
              </label>
              <button className="btn solid sm" type="submit">Speichern</button>
            </div>
            <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
              Eine bereits vorhandene Periode wird überschrieben.
            </p>
          </form>
        </div>
      ) : null}
      </div>
    </section>
  );
}
