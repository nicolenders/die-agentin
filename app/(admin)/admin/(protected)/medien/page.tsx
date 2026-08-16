import Link from "next/link";
import { getMediaLibrary, getMediaDocuments } from "@/lib/queries/media";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import MediaUpload from "@/components/admin/MediaUpload";
import DocumentUpload from "@/components/admin/DocumentUpload";
import AssetImage from "@/components/media/AssetImage";
import MediaLibraryTable from "@/components/admin/MediaLibraryTable";
import { updateAsset, deleteAsset, updateDocument, deleteDocument } from "./actions";

export const metadata = { title: "Medien · Zentrale" };

// Drei Register: Bilder und Präsentationen zeigen, was da ist; Hochladen bringt
// Neues dazu. Der aktive Tab steht in der URL (?tab=…), damit er Reload und
// Weiterleitung nach dem Speichern übersteht.
const TABS = [
  { id: "bilder", label: "Bilder" },
  { id: "praesentationen", label: "Präsentationen" },
  { id: "hochladen", label: "Hochladen" },
] as const;

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function MedienPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string }>;
}) {
  const { ok, err, tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "bilder";

  let items: Awaited<ReturnType<typeof getMediaLibrary>> = [];
  let docs: Awaited<ReturnType<typeof getMediaDocuments>> = [];
  let dbError = false;
  try {
    [items, docs] = await Promise.all([getMediaLibrary(), getMediaDocuments()]);
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Medien</h1>
      <p className="muted">
        Bilder und Präsentationen an einem Ort. Alt-Texte für Bilder sind Pflicht (außer
        dekorativ). Klick auf ein Vorschaubild zeigt es groß.
      </p>
      <Flash ok={ok} err={err} />

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <a
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`tab${t.id === active ? " active" : ""}`}
            href={`/admin/medien?tab=${t.id}`}
          >
            {t.label}
            {t.id === "bilder" ? <span className="tab-count">{items.length}</span> : null}
            {t.id === "praesentationen" ? <span className="tab-count">{docs.length}</span> : null}
          </a>
        ))}
      </div>

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block", marginTop: 18 }}>Datenbank wird geweckt …</p>
      ) : null}

      <div style={{ marginTop: 18 }}>
        {active === "bilder" ? (
          items.length === 0 ? (
            <div className="card bracket">
              <p className="muted" style={{ margin: 0 }}>
                Noch keine Bilder. Im Register „Hochladen“ das erste hinzufügen.
              </p>
            </div>
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
          )
        ) : null}

        {active === "praesentationen" ? (
          docs.length === 0 ? (
            <div className="card bracket">
              <p className="muted" style={{ margin: 0 }}>
                Noch keine Präsentationen. PDFs lädst du im Register „Hochladen“ hoch — oder
                direkt beim Einsatz unter „Folien als PDF“.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="media-table">
                <thead>
                  <tr>
                    <th>Datei</th>
                    <th>Beschreibung</th>
                    <th>Größe</th>
                    <th>Hochgeladen</th>
                    <th>Verwendet in</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <a href={d.url} target="_blank" rel="noopener noreferrer">📄 {d.fileName}</a>
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <form action={updateDocument} id={`doc-${d.id}`}>
                          <input type="hidden" name="id" value={d.id} />
                        </form>
                        <input
                          className="f"
                          form={`doc-${d.id}`}
                          name="title"
                          defaultValue={d.title ?? ""}
                          placeholder="Beschreibung"
                          aria-label="Beschreibung"
                        />
                      </td>
                      <td className="meta" style={{ whiteSpace: "nowrap" }}>{formatBytes(d.bytes)}</td>
                      <td className="meta" style={{ whiteSpace: "nowrap" }}>{formatDate(d.createdAt, "de")}</td>
                      <td style={{ minWidth: 160 }}>
                        {d.usages.length === 0 ? (
                          <span className="meta">ungenutzt</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {d.usages.map((u, i) => (
                              <span key={i} className="tag" style={{ fontSize: 11 }}>{u.type}: {u.label}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn ghost sm" type="submit" form={`doc-${d.id}`}>Speichern</button>{" "}
                        <form action={deleteDocument} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={d.id} />
                          <ConfirmButton
                            confirmText={
                              d.usages.length > 0
                                ? "Diese Datei hängt an einem Einsatz und kann nicht gelöscht werden."
                                : "Eintrag wirklich löschen?"
                            }
                          >
                            Löschen
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {active === "hochladen" ? (
          <div className="form-2col">
            <MediaUpload />
            <DocumentUpload />
          </div>
        ) : null}
      </div>

      {active !== "hochladen" ? (
        <p className="meta" style={{ marginTop: 18 }}>
          Neues Bild oder PDF? <Link href="/admin/medien?tab=hochladen">Zum Register „Hochladen“</Link>.
        </p>
      ) : null}
    </section>
  );
}
