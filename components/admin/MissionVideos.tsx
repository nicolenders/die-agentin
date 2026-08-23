import Link from "next/link";
import AssetImage from "@/components/media/AssetImage";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { selectableVideos, videoChoiceLabel, type VideoChoice } from "@/lib/video/mission-videos";

// Videos zu einem Einsatz. Bewusst ein Server-Bauteil ohne eigenen Zustand:
// Alles hier sind Formulare, die eine Server Action anstoßen und die Seite neu
// laden. Ein Auswahlfeld und ein Textfeld brauchen kein JavaScript.

export interface LinkedVideo {
  id: string;
  title: string;
  channel: string | null;
  year: number;
  videoId: string | null;
  watchUrl: string | null;
  coverUrl: string | null;
  coverAlt: string;
  coverAi: boolean;
}

type FormAction = (formData: FormData) => void | Promise<void>;

export default function MissionVideos({
  missionId,
  linked,
  choices,
  suggestedVideoId,
  addAction,
  linkAction,
  unlinkAction,
}: {
  missionId: string | null;
  linked: LinkedVideo[];
  choices: VideoChoice[];
  /**
   * Kennung aus dem Feld „Aufzeichnung" weiter oben in der Maske, sofern es
   * daraus noch keine Publikation gibt. Dann steht sie hier als Vorschlag —
   * dieselbe Adresse zweimal einzutippen wäre Unsinn.
   */
  suggestedVideoId: string | null;
  addAction: FormAction;
  linkAction: FormAction;
  unlinkAction: FormAction;
}) {
  if (!missionId) {
    return (
      <div className="card bracket" style={{ marginTop: 16 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Videos zu diesem Einsatz</p>
        <p className="meta" style={{ margin: 0 }}>
          Erst den Einsatz anlegen, dann lassen sich Videos zuordnen — sie hängen an diesem Einsatz.
        </p>
      </div>
    );
  }

  const available = selectableVideos(choices, missionId);

  return (
    <div className="card bracket" style={{ marginTop: 16 }}>
      <p className="eyebrow" style={{ marginTop: 0 }}>Videos zu diesem Einsatz</p>
      <p className="meta" style={{ marginTop: -6 }}>
        Aufzeichnung, Interview, Ausschnitt eines Veranstalters — alles, was von diesem Auftritt
        auf YouTube gelandet ist. Jedes Video ist zugleich eine Publikation: Es steht damit unter{" "}
        <Link href="/admin/publikationen?tab=videos">Publikationen → Videos</Link> und öffentlich in
        der Galerie <a href="/de/sichtungen" target="_blank" rel="noopener noreferrer">Sichtungen ↗</a>.
      </p>

      {linked.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Noch kein Video. Unten eine Adresse einwerfen — Titel, Kanal und Vorschaubild kommen von
          selbst.
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 132 }}>Vorschau</th>
                <th>Titel</th>
                <th style={{ width: 180 }}>Kanal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linked.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.coverUrl ? (
                      <AssetImage
                        compact
                        aiLabel="KI"
                        src={v.coverUrl}
                        alt={v.coverAlt}
                        ai={v.coverAi}
                        imgStyle={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }}
                      />
                    ) : (
                      <span className="meta">kein Bild</span>
                    )}
                  </td>
                  <td>
                    <b>{v.title}</b>
                    <div className="meta">
                      {v.year}
                      {v.watchUrl ? (
                        <>
                          {" · "}
                          <a href={v.watchUrl} target="_blank" rel="noopener noreferrer">
                            Auf YouTube ansehen ↗
                          </a>
                        </>
                      ) : null}
                      {" · "}
                      <Link href={`/admin/publikationen/bearbeiten?pub=${v.id}`}>Bearbeiten</Link>
                    </div>
                  </td>
                  <td className="meta">{v.channel ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={unlinkAction} style={{ display: "inline" }}>
                      <input type="hidden" name="missionId" value={missionId} />
                      <input type="hidden" name="publicationId" value={v.id} />
                      <ConfirmButton confirmText={`Zuordnung von „${v.title}“ lösen? Das Video bleibt unter Publikationen bestehen.`}>
                        Lösen
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid g2" style={{ gap: 16, alignItems: "start", marginTop: 18 }}>
        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>Adresse einwerfen</p>
          <p className="meta" style={{ marginTop: -6 }}>
            Legt die Publikation gleich mit an: Titel und Kanal holt YouTube, das Vorschaubild
            wandert in die eigene Medienablage. Gibt es das Video schon, wird es nur zugeordnet.
          </p>
          <form action={addAction}>
            <input type="hidden" name="missionId" value={missionId} />
            <label className="f" htmlFor="mission-video-url">YouTube-Adresse</label>
            <input
              className="f"
              id="mission-video-url"
              name="url"
              defaultValue={suggestedVideoId ? `https://www.youtube.com/watch?v=${suggestedVideoId}` : ""}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {suggestedVideoId ? (
              <p className="meta" style={{ marginTop: 4 }}>
                Vorbelegt aus dem Feld „Aufzeichnung“ oben — daraus gibt es noch keine Publikation.
              </p>
            ) : null}
            <button className="btn solid sm" type="submit" style={{ marginTop: 10 }}>
              Anlegen und zuordnen
            </button>
          </form>
        </div>

        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>Vorhandenes Video zuordnen</p>
          <p className="meta" style={{ marginTop: -6 }}>
            Aus den bereits erfassten Videos. Was schon an einem anderen Einsatz hängt, steht unten
            und trägt dessen Namen — Umhängen ist damit ein Griff.
          </p>
          {available.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Keine weiteren Videos erfasst. Unter{" "}
              <Link href="/admin/publikationen?tab=videos">Publikationen → Videos</Link> lassen sich
              viele auf einmal einfügen.
            </p>
          ) : (
            <form action={linkAction}>
              <input type="hidden" name="missionId" value={missionId} />
              <label className="f" htmlFor="mission-video-pick">Video</label>
              <select className="f" id="mission-video-pick" name="publicationId" defaultValue="">
                <option value="" disabled>— auswählen —</option>
                {available.map((v) => (
                  <option key={v.id} value={v.id}>{videoChoiceLabel(v)}</option>
                ))}
              </select>
              <button className="btn ghost sm" type="submit" style={{ marginTop: 10 }}>
                Zuordnen
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
