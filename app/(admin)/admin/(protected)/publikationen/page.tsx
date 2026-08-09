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
import { CERT_KINDS, CERT_KIND_LABEL } from "@/lib/records/kind";
import {
  createPublication,
  createCertification,
  createFocusTopic,
  deletePublication,
  deleteCertification,
  deleteFocusTopic,
} from "./actions";

export const metadata = { title: "Publikationen & Ausbildung · Zentrale" };

const PUB_TYPES = [
  { id: "BOOK", label: "Bücher" },
  { id: "ARTICLE", label: "Fachartikel" },
  { id: "WHITEPAPER", label: "Whitepaper" },
] as const;

interface PubRow {
  id: string;
  title: string;
  type: string;
  year: number;
  role: string | null;
  coverUrl: string | null;
  coverAlt: string;
  coverAi: boolean;
}
interface CertRow {
  id: string;
  name: string;
  kind: string;
  meta: string;
  logoUrl: string | null;
  logoAi: boolean;
}

export default async function RecordsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let pubs: PubRow[] = [];
  let certs: CertRow[] = [];
  let certCats: { id: string; nameDe: string }[] = [];
  let focus: { id: string; titleDe: string; titleEn: string | null; note: string | null }[] = [];
  let dbError = false;
  try {
    const [pubRows, certRows, cats, focusRows] = await Promise.all([
      db.publication.findMany({ orderBy: { year: "desc" }, include: { translations: { where: { locale: "de" } }, coverAsset: true } }),
      db.certification.findMany({ orderBy: { acquiredOn: "desc" }, include: { categories: true, logo: true } }),
      db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" } }),
      db.focusTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    ]);
    pubs = pubRows.map((p) => ({
      id: p.id,
      title: p.translations[0]?.title ?? "(ohne Titel)",
      type: p.type,
      year: p.year,
      role: p.translations[0]?.role ?? null,
      coverUrl: p.coverAsset ? assetUrl(p.coverAsset.blobPath) : null,
      coverAlt: p.coverAsset?.altDe || p.translations[0]?.title || "Cover",
      coverAi: p.coverAsset?.source === "AI",
    }));
    certs = certRows.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      meta: [c.shortCode, c.categories.map((x) => x.nameDe).join(", ") || null, formatDate(c.acquiredOn, "de")].filter(Boolean).join(" · "),
      logoUrl: c.logo ? assetUrl(c.logo.blobPath) : null,
      logoAi: c.logo?.source === "AI",
    }));
    certCats = cats.map((c) => ({ id: c.id, nameDe: c.nameDe }));
    focus = focusRows.map((f) => ({ id: f.id, titleDe: f.titleDe, titleEn: f.titleEn, note: f.note }));
  } catch {
    dbError = true;
  }

  const pubList = (type: string) => {
    const rows = pubs.filter((p) => p.type === type);
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>Noch nichts erfasst.</p>;
    return (
      <table style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              {type === "BOOK" ? (
                <td style={{ width: 60 }}>
                  {p.coverUrl ? (
                    <AssetImage src={p.coverUrl} alt={p.coverAlt} ai={p.coverAi} imgStyle={{ width: 46, height: 62, objectFit: "cover", borderRadius: 3 }} />
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
              ) : null}
              <td>
                <b>{p.title}</b>
                <div className="meta">{[p.year, p.role].filter(Boolean).join(" · ")}</div>
              </td>
              <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                <Link className="btn ghost sm" href={`/admin/publikationen/bearbeiten?pub=${p.id}`}>Bearbeiten</Link>{" "}
                <form action={deletePublication} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton confirmText={`„${p.title}" wirklich löschen?`}>Löschen</ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const pubForm = (type: string) => (
    <form action={createPublication} style={{ marginTop: 16 }}>
      <input type="hidden" name="type" value={type} />
      {type === "ARTICLE" ? (
        <p className="meta" style={{ marginTop: 0 }}>Auch Gastbeiträge in fremden Blogs (z. B. MVP-Treff, Microsoft) — Medium und Link angeben.</p>
      ) : null}
      <label className="f">Titel (DE)</label>
      <input className="f" name="deTitle" placeholder="Titel" required />
      <label className="f">Jahr</label>
      <input className="f" name="year" type="number" defaultValue={2026} />
      <label className="f">Rolle (z. B. Co-Autorin)</label>
      <input className="f" name="role" />
      <label className="f">{type === "ARTICLE" ? "Medium / Blog" : "Verlag / Medium"}</label>
      <input className="f" name="publisher" placeholder={type === "ARTICLE" ? "z. B. MVP-Treff, Microsoft Tech Community" : ""} />
      {type === "BOOK" ? (
        <>
          <label className="f">ISBN (optional)</label>
          <input className="f" name="isbn" />
        </>
      ) : null}
      <label className="f">Link (optional)</label>
      <input className="f" name="url" placeholder="https://…" />
      {type === "BOOK" ? (
        <>
          <label className="f">Cover (optional)</label>
          <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="3 / 4" emptyHint="Kein Cover gewählt" />
        </>
      ) : (
        <input type="hidden" name="coverAssetId" value="" />
      )}
      <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ {PUB_TYPES.find((t) => t.id === type)?.label.replace(/e?r?$/, "") ?? "Eintrag"} anlegen</button>
    </form>
  );

  const certList = (kind: string) => {
    const rows = certs.filter((c) => c.kind === kind);
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>Noch nichts erfasst.</p>;
    return (
      <table style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td style={{ width: 48 }}>
                {c.logoUrl ? (
                  <AssetImage src={c.logoUrl} alt={c.name} ai={c.logoAi} imgStyle={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }} />
                ) : (
                  <span className="meta">—</span>
                )}
              </td>
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
    );
  };

  const certForm = (kind: string) => (
    <form action={createCertification} style={{ marginTop: 16 }}>
      <input type="hidden" name="kind" value={kind} />
      <label className="f">Kategorien (optional, Mehrfachauswahl)</label>
      <CategoryMultiSelect name="categoryIds" options={certCats.map((c) => ({ id: c.id, name: c.nameDe }))} emptyHint="Optional — Kategorien unter „Kategorien & Tags“ anlegen." />
      <label className="f">Bezeichnung</label>
      <input className="f" name="name" placeholder="z. B. Azure AI Engineer Associate" required />
      <label className="f">Kürzel</label>
      <input className="f" name="shortCode" placeholder="AI-102" />
      <label className="f">{kind === "MVP" ? "Ausgezeichnet am" : kind === "TRAINING" ? "Absolviert am" : "Erworben am"}</label>
      <input className="f" name="acquiredOn" type="month" required />
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

  const pubTabs: TabDef[] = PUB_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    badge: pubs.filter((p) => p.type === t.id).length,
    content: (
      <>
        {pubList(t.id)}
        {pubForm(t.id)}
      </>
    ),
  }));

  const certTabs: TabDef[] = CERT_KINDS.map((k) => ({
    id: k,
    label: CERT_KIND_LABEL[k],
    badge: certs.filter((c) => c.kind === k).length,
    content: (
      <>
        {certList(k)}
        {certForm(k)}
      </>
    ),
  }));

  return (
    <section>
      <h1>Publikationen &amp; Ausbildung</h1>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card bracket">
          <p className="eyebrow">Publikationen</p>
          <Tabs tabs={pubTabs} />
        </div>

        <div className="card bracket">
          <p className="eyebrow">Ausbildung &amp; Auszeichnungen</p>
          <Tabs tabs={certTabs} />
        </div>
      </div>

      <div className="card bracket" style={{ marginTop: 16 }}>
        <p className="eyebrow">Woran ich gerade lerne / arbeite</p>
        <p className="meta" style={{ marginTop: 0 }}>
          Aktuelle Themen — müssen nicht zu einer Zertifizierung führen. Erscheinen öffentlich unter Ausbildung.
        </p>
        {focus.length > 0 ? (
          <table>
            <tbody>
              {focus.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.titleDe}</b>
                    {f.titleEn ? <span className="meta"> · {f.titleEn}</span> : null}
                    {f.note ? <div className="meta">{f.note}</div> : null}
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={deleteFocusTopic} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton confirmText={`Thema „${f.titleDe}" entfernen?`}>Entfernen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <form action={createFocusTopic} style={{ marginTop: 12, maxWidth: 560 }}>
          <label className="f">Thema (DE)</label>
          <input className="f" name="titleDe" placeholder="z. B. Agentische KI mit Copilot Studio" required />
          <label className="f">Thema (EN, optional)</label>
          <input className="f" name="titleEn" />
          <label className="f">Notiz (optional)</label>
          <input className="f" name="note" placeholder="Kurzer Kontext, z. B. Vortragsthema" />
          <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>+ Thema hinzufügen</button>
        </form>
      </div>
    </section>
  );
}
