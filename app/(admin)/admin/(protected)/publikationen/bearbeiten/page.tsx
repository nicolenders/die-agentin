import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import Flash from "@/components/admin/Flash";
import AssetPickerField from "@/components/admin/AssetPickerField";
import { updatePublication } from "../actions";

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
    include: { translations: { where: { locale: "de" } }, coverAsset: true },
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
      <div className="card bracket" style={{ marginTop: 16, maxWidth: 560 }}>
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
    </section>
  );
}
