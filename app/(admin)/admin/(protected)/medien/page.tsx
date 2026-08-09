import { getMediaLibrary } from "@/lib/queries/media";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import MediaUpload from "@/components/admin/MediaUpload";
import AssetImage from "@/components/media/AssetImage";
import MediaLibraryTable from "@/components/admin/MediaLibraryTable";
import { updateAsset, deleteAsset } from "./actions";

export const metadata = { title: "Medien · Zentrale" };

export default async function MedienPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let items: Awaited<ReturnType<typeof getMediaLibrary>> = [];
  let dbError = false;
  try {
    items = await getMediaLibrary();
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Medien</h1>
      <p className="muted">
        Bilder hochladen, Metadaten pflegen, ungenutzte entfernen. Alt-Texte sind
        Pflicht (außer dekorativ). Klick auf ein Vorschaubild zeigt es groß.
      </p>
      <Flash ok={ok} err={err} />

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        <MediaUpload />
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Bibliothek</p>
      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : items.length === 0 ? (
        <div className="card bracket"><p className="muted">Noch keine Bilder. Lad das erste oben hoch.</p></div>
      ) : (
        <MediaLibraryTable
          rows={items.map((a) => ({
            id: a.id,
            source: a.source,
            createdAtLabel: formatDate(a.createdAt, "de"),
            size: `${a.width}×${a.height}`,
            usages: a.usages,
            thumb: <AssetImage src={a.url} alt={a.altDe || "Bild"} ai={a.source === "AI"} imgStyle={{ width: 72, height: 72, objectFit: "cover", borderRadius: 4 }} />,
            editForm: (
              <form action={updateAsset} id={`asset-${a.id}`}>
                <input type="hidden" name="id" value={a.id} />
              </form>
            ),
            deleteForm: (
              <form action={deleteAsset} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton
                  confirmText={
                    a.usages.length > 0
                      ? "Dieses Bild wird verwendet und kann nicht gelöscht werden."
                      : "Bild wirklich löschen?"
                  }
                >
                  Löschen
                </ConfirmButton>
              </form>
            ),
            defaults: { altDe: a.altDe, altEn: a.altEn ?? "", decorative: a.decorative },
          }))}
        />
      )}
    </section>
  );
}
