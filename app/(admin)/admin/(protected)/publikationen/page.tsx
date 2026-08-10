import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import ConfirmButton from "@/components/admin/ConfirmButton";
import AssetPickerField from "@/components/admin/AssetPickerField";
import AssetImage from "@/components/media/AssetImage";
import Flash from "@/components/admin/Flash";
import Tabs, { type TabDef } from "@/components/admin/Tabs";
import { createPublication, deletePublication } from "./actions";

export const metadata = { title: "Publikationen · Zentrale" };

const PUB_TYPES = [
  { id: "BOOK", label: "Bücher", singular: "Buch" },
  { id: "ARTICLE", label: "Fachartikel", singular: "Fachartikel" },
  { id: "WHITEPAPER", label: "Whitepaper", singular: "Whitepaper" },
  { id: "COURSE", label: "Kurse", singular: "Kurs" },
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

export default async function PublikationenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let pubs: PubRow[] = [];
  let dbError = false;
  try {
    const rows = await db.publication.findMany({
      orderBy: { year: "desc" },
      include: { translations: { where: { locale: "de" } }, coverAsset: true },
    });
    pubs = rows.map((p) => ({
      id: p.id,
      title: p.translations[0]?.title ?? "(ohne Titel)",
      type: p.type,
      year: p.year,
      role: p.translations[0]?.role ?? null,
      coverUrl: p.coverAsset ? assetUrl(p.coverAsset.blobPath) : null,
      coverAlt: p.coverAsset?.altDe || p.translations[0]?.title || "Cover",
      coverAi: p.coverAsset?.source === "AI",
    }));
  } catch {
    dbError = true;
  }

  const list = (type: string) => {
    const rows = pubs.filter((p) => p.type === type);
    if (rows.length === 0) return <p className="muted" style={{ marginTop: 12 }}>Noch nichts erfasst.</p>;
    return (
      <table style={{ marginTop: 4 }}>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              {type === "BOOK" || type === "COURSE" ? (
                <td style={{ width: 60 }}>
                  {p.coverUrl ? (
                    <AssetImage
                      src={p.coverUrl}
                      alt={p.coverAlt}
                      ai={p.coverAi}
                      imgStyle={
                        type === "COURSE"
                          ? { width: 64, height: 36, objectFit: "cover", borderRadius: 3 }
                          : { width: 46, height: 62, objectFit: "cover", borderRadius: 3 }
                      }
                    />
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

  const form = (type: string, singular: string) => (
    <form action={createPublication}>
      <input type="hidden" name="type" value={type} />
      {type === "ARTICLE" ? (
        <p className="meta" style={{ marginTop: 0 }}>Auch Gastbeiträge in fremden Blogs (z. B. MVP-Treff, Microsoft) — Medium und Link angeben.</p>
      ) : null}
      {type === "COURSE" ? (
        <p className="meta" style={{ marginTop: 0 }}>Eigene Trainings, z. B. auf LinkedIn Learning. Plattform und Link zum Kurs angeben; Thumbnail optional.</p>
      ) : null}
      <label className="f">Titel (DE)</label>
      <input className="f" name="deTitle" placeholder={type === "COURSE" ? "Kurstitel" : "Titel"} required />
      <label className="f">Jahr</label>
      <input className="f" name="year" type="number" defaultValue={2026} />
      <label className="f">{type === "COURSE" ? "Rolle" : "Rolle (z. B. Co-Autorin)"}</label>
      <input className="f" name="role" defaultValue={type === "COURSE" ? "Trainerin" : undefined} />
      <label className="f">{type === "ARTICLE" ? "Medium / Blog" : type === "COURSE" ? "Plattform" : "Verlag / Medium"}</label>
      <input
        className="f"
        name="publisher"
        defaultValue={type === "COURSE" ? "LinkedIn Learning" : undefined}
        placeholder={type === "ARTICLE" ? "z. B. MVP-Treff, Microsoft Tech Community" : ""}
      />
      {type === "BOOK" ? (
        <>
          <label className="f">ISBN (optional)</label>
          <input className="f" name="isbn" />
        </>
      ) : null}
      <label className="f">{type === "COURSE" ? "Link zum Kurs" : "Link (optional)"}</label>
      <input className="f" name="url" placeholder="https://…" />
      {type === "BOOK" ? (
        <>
          <label className="f">Cover (optional)</label>
          <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="3 / 4" emptyHint="Kein Cover gewählt" />
        </>
      ) : type === "COURSE" ? (
        <>
          <label className="f">Thumbnail (optional)</label>
          <AssetPickerField name="coverAssetId" initialAssetId={null} initialUrl={null} aspectRatio="16 / 9" emptyHint="Kein Thumbnail gewählt" />
        </>
      ) : (
        <input type="hidden" name="coverAssetId" value="" />
      )}
      <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>+ {singular} anlegen</button>
    </form>
  );

  const tabs: TabDef[] = PUB_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    badge: pubs.filter((p) => p.type === t.id).length,
    content: (
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        <div>
          <p className="eyebrow">Neuer Eintrag</p>
          {form(t.id, t.singular)}
        </div>
        <div>
          <p className="eyebrow">Vorhandene ({pubs.filter((p) => p.type === t.id).length})</p>
          {list(t.id)}
        </div>
      </div>
    ),
  }));

  return (
    <section>
      <h1>Publikationen</h1>
      <p className="muted">Bücher, Fachartikel, Whitepaper und Kurse — je Art links anlegen, rechts verwalten.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <Tabs tabs={tabs} />
      </div>
    </section>
  );
}
