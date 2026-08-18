import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import AssetPickerField from "@/components/admin/AssetPickerField";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import AssetImage from "@/components/media/AssetImage";
import Flash from "@/components/admin/Flash";
import Tabs, { type TabDef } from "@/components/admin/Tabs";
import { CERT_KINDS, CERT_KIND_LABEL, CERT_FAMILIES, CERT_FAMILY_SHORT } from "@/lib/records/kind";
import { createCertification, deleteCertification, reorderCertification } from "../publikationen/actions";

export const metadata = { title: "Ausbildung & Auszeichnungen · Zentrale" };

interface CertRow {
  id: string;
  name: string;
  kind: string;
  family: string;
  meta: string;
  logoUrl: string | null;
  logoAi: boolean;
}

export default async function AusbildungAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let certs: CertRow[] = [];
  let certCats: { id: string; nameDe: string }[] = [];
  let dbError = false;
  try {
    const [certRows, cats] = await Promise.all([
      db.certification.findMany({ orderBy: [{ sortOrder: "asc" }, { acquiredOn: "desc" }], include: { categories: true, logo: true } }),
      db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" } }),
    ]);
    certs = certRows.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      family: c.family,
      meta: [
        c.kind === "CERTIFICATION" ? CERT_FAMILY_SHORT[c.family === "METHODICAL" ? "METHODICAL" : "MICROSOFT"] : null,
        c.shortCode,
        c.categories.map((x) => x.nameDe).join(", ") || null,
        formatDate(c.acquiredOn, "de"),
      ].filter(Boolean).join(" · "),
      logoUrl: c.logo ? assetUrl(c.logo.blobPath) : null,
      logoAi: c.logo?.source === "AI",
    }));
    certCats = cats.map((c) => ({ id: c.id, nameDe: c.nameDe }));
  } catch {
    dbError = true;
  }

  const list = (kind: string) => {
    const rows = certs.filter((c) => c.kind === kind);
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>Noch nichts erfasst.</p>;
    return (
      <table style={{ marginTop: 4 }}>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.id}>
              <td style={{ width: 34, whiteSpace: "nowrap", verticalAlign: "middle" }}>
                <form action={reorderCertification} style={{ display: "block", lineHeight: 0 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button className="btn ghost sm" type="submit" disabled={i === 0} aria-label={`„${c.name}" nach oben`} title="Nach oben">↑</button>
                </form>
                <form action={reorderCertification} style={{ display: "block", lineHeight: 0, marginTop: 4 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button className="btn ghost sm" type="submit" disabled={i === rows.length - 1} aria-label={`„${c.name}" nach unten`} title="Nach unten">↓</button>
                </form>
              </td>
              <td style={{ width: 48 }}>
                {c.logoUrl ? (
                  <AssetImage compact aiLabel="KI" src={c.logoUrl} alt={c.name} ai={c.logoAi} imgStyle={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }} />
                ) : (
                  <span className="meta">—</span>
                )}
              </td>
              <td>
                <b>{c.name}</b>
                <div className="meta">{c.meta}</div>
              </td>
              <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                <Link className="btn ghost sm" href={`/admin/ausbildung/bearbeiten?cert=${c.id}`}>Bearbeiten</Link>{" "}
                <form action={deleteCertification} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton confirmText={`„${c.name}" wirklich löschen?`}>Löschen</ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const form = (kind: string) => (
    <form action={createCertification}>
      <input type="hidden" name="kind" value={kind} />
      {kind === "CERTIFICATION" ? (
        <>
          <label className="f">Art der Zertifizierung</label>
          <select className="f" name="family" defaultValue="MICROSOFT">
            {CERT_FAMILIES.map((f) => (
              <option key={f} value={f}>{CERT_FAMILY_SHORT[f]}</option>
            ))}
          </select>
          <label className="f">Status</label>
          <select className="f" name="status" defaultValue="ACHIEVED">
            <option value="ACHIEVED">Erworben</option>
            <option value="PLANNED">In Ausbildung (geplant)</option>
            <option value="EXPIRED">Abgelaufen</option>
          </select>
          <label className="f">Ziel (nur „In Ausbildung“, z. B. „Q4 2026“)</label>
          <input className="f" name="plannedFor" />
        </>
      ) : (
        <input type="hidden" name="family" value="MICROSOFT" />
      )}
      <label className="f">Kategorien (optional, Mehrfachauswahl)</label>
      <CategoryMultiSelect name="categoryIds" options={certCats.map((c) => ({ id: c.id, name: c.nameDe }))} emptyHint="Optional: Kategorien unter „Kategorien & Tags“ anlegen." />
      <label className="f">Bezeichnung</label>
      <input className="f" name="name" placeholder="z. B. Azure AI Engineer Associate" required />
      <label className="f">Kürzel</label>
      <input className="f" name="shortCode" placeholder="AI-102" />
      <label className="f">{kind === "MVP" ? "Ausgezeichnet am" : kind === "TRAINING" ? "Absolviert am" : "Erworben am (leer bei „In Ausbildung“)"}</label>
      <input className="f" name="acquiredOn" type="month" />
      <label className="f">Gültig bis (optional)</label>
      <input className="f" name="validUntil" type="month" />
      {kind === "MVP" ? (
        <>
          <label className="f">Reihe (Mehrfachauszeichnung)</label>
          <input className="f" name="series" defaultValue="MVP" />
        </>
      ) : (
        <input type="hidden" name="series" value="" />
      )}
      <label className="f">Nachweis-Link (optional)</label>
      <input className="f" name="proofUrl" placeholder="https://…" />
      <label className="f">Logo (optional)</label>
      <AssetPickerField name="logoAssetId" initialAssetId={null} initialUrl={null} aspectRatio="1 / 1" objectFit="contain" emptyHint="Kein Logo gewählt" />
      <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ Eintrag anlegen</button>
    </form>
  );

  const tabs: TabDef[] = CERT_KINDS.map((k) => ({
    id: k,
    label: CERT_KIND_LABEL[k],
    badge: certs.filter((c) => c.kind === k).length,
    content: (
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        <div>
          <p className="eyebrow">Neuer Eintrag</p>
          {form(k)}
        </div>
        <div>
          <p className="eyebrow">Vorhandene ({certs.filter((c) => c.kind === k).length})</p>
          {list(k)}
        </div>
      </div>
    ),
  }));

  return (
    <section>
      <h1>Ausbildung &amp; Auszeichnungen</h1>
      <p className="muted">Zertifizierungen, MVP Awards, Schulungen und weitere Auszeichnungen: je Art links anlegen, rechts verwalten.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <Tabs tabs={tabs} />
      </div>
    </section>
  );
}
