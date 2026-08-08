import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import MediaUpload from "@/components/admin/MediaUpload";
import { updateAsset, deleteAsset } from "./actions";

export const metadata = { title: "Medien · Zentrale" };

export default async function MedienPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let assets: Awaited<ReturnType<typeof load>> = [];
  let dbError = false;
  try {
    assets = await load();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Medien</h1>
      <p className="muted">Bilder hochladen, Alt-Texte pflegen, ungenutzte entfernen. Alt-Texte sind Pflicht (außer dekorativ).</p>
      <Flash ok={ok} err={err} />

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        <MediaUpload />
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Bibliothek</p>
      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : assets.length === 0 ? (
        <div className="card bracket"><p className="muted">Noch keine Bilder. Lad das erste oben hoch.</p></div>
      ) : (
        <div className="grid g3">
          {assets.map((a) => (
            <div className="card bracket" key={a.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.altDe} style={{ width: "100%", borderRadius: 4, aspectRatio: "3 / 2", objectFit: "cover" }} />
              <p className="meta" style={{ marginTop: 6 }}>
                {a.width}×{a.height}px{a.usage > 0 ? ` · ${a.usage}× verwendet` : " · ungenutzt"}
              </p>
              <form action={updateAsset} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={a.id} />
                <label className="f">Alt-Text (DE)</label>
                <input className="f" name="altDe" defaultValue={a.altDe} placeholder="Bildbeschreibung" />
                <label className="f">Alt-Text (EN)</label>
                <input className="f" name="altEn" defaultValue={a.altEn ?? ""} />
                <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13 }}>
                  <input type="checkbox" name="decorative" value="true" defaultChecked={a.decorative} /> Dekorativ
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn ghost sm" type="submit">Speichern</button>
                </div>
              </form>
              <form action={deleteAsset} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton
                  confirmText={a.usage > 0 ? "Dieses Bild wird verwendet und kann nicht gelöscht werden." : "Bild wirklich löschen?"}
                >
                  Löschen
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function load() {
  const rows = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { missionPhotos: true, postHeroes: true, publicationCovers: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    url: assetUrl(a.blobPath),
    altDe: a.altDe,
    altEn: a.altEn,
    decorative: a.decorative,
    width: a.width,
    height: a.height,
    usage: a._count.missionPhotos + a._count.postHeroes + a._count.publicationCovers,
  }));
}
