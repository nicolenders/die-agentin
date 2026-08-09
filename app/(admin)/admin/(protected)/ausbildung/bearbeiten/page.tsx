import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import Flash from "@/components/admin/Flash";
import AssetPickerField from "@/components/admin/AssetPickerField";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import { CERT_KINDS, CERT_KIND_LABEL } from "@/lib/records/kind";
import { updateCertification } from "../../publikationen/actions";

export const metadata = { title: "Bearbeiten · Ausbildung · Zentrale" };

function monthValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 7) : "";
}

export default async function CertEditPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string; err?: string }>;
}) {
  const { cert, err } = await searchParams;

  const back = (
    <div style={{ marginBottom: 12 }}>
      <Link className="btn ghost sm" href="/admin/ausbildung">← Zurück zur Übersicht</Link>
    </div>
  );

  if (!cert) {
    return <section>{back}<p className="muted">Kein Eintrag ausgewählt.</p></section>;
  }

  const [row, cats] = await Promise.all([
    db.certification.findUnique({ where: { id: cert }, include: { categories: true, logo: true } }),
    db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!row) {
    return <section>{back}<p className="st">Eintrag nicht gefunden.</p></section>;
  }
  const logoUrl = row.logo ? assetUrl(row.logo.blobPath) : null;

  return (
    <section>
      {back}
      <h1>Eintrag bearbeiten</h1>
      <Flash err={err} />
      <div className="card bracket" style={{ marginTop: 16, maxWidth: 560 }}>
        <form action={updateCertification}>
          <input type="hidden" name="id" value={row.id} />
          <label className="f">Art</label>
          <select className="f" name="kind" defaultValue={row.kind}>
            {CERT_KINDS.map((k) => (
              <option key={k} value={k}>{CERT_KIND_LABEL[k]}</option>
            ))}
          </select>
          <label className="f">Kategorien (optional, Mehrfachauswahl)</label>
          <CategoryMultiSelect name="categoryIds" options={cats.map((c) => ({ id: c.id, name: c.nameDe }))} defaultSelected={row.categories.map((c) => c.id)} />
          <label className="f">Bezeichnung</label>
          <input className="f" name="name" defaultValue={row.name} required />
          <label className="f">Kürzel</label>
          <input className="f" name="shortCode" defaultValue={row.shortCode ?? ""} />
          <label className="f">Erworben am</label>
          <input className="f" name="acquiredOn" type="month" defaultValue={monthValue(row.acquiredOn)} required />
          <label className="f">Gültig bis (optional)</label>
          <input className="f" name="validUntil" type="month" defaultValue={monthValue(row.validUntil)} />
          <label className="f">Reihe (Mehrfachauszeichnung, z. B. MVP)</label>
          <input className="f" name="series" defaultValue={row.series ?? ""} />
          <label className="f">Nachweis-Link (optional)</label>
          <input className="f" name="proofUrl" defaultValue={row.proofUrl ?? ""} placeholder="https://…" />
          <label className="f">Logo (optional)</label>
          <AssetPickerField name="logoAssetId" initialAssetId={row.logoAssetId} initialUrl={logoUrl} aspectRatio="1 / 1" objectFit="contain" emptyHint="Kein Logo gewählt" />
          <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>Änderungen speichern</button>
        </form>
      </div>
    </section>
  );
}
