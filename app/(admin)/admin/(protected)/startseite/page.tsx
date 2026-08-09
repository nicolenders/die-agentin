import { assetUrl } from "@/lib/media/url";
import { getHomeHero, getHomeContentRaw, getHomeStats } from "@/lib/queries/home";
import type { Locale } from "@/lib/i18n/config";
import Flash from "@/components/admin/Flash";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import { saveHomeHero, saveMvpAwards } from "./actions";

export const metadata = { title: "Startseite · Zentrale" };

const LOCALES: { code: Locale; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "Englisch" },
];

export default async function StartseiteAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  const data = await Promise.all(
    LOCALES.map(async ({ code, label }) => ({
      code,
      label,
      hero: await getHomeHero(code),
      raw: await getHomeContentRaw(code),
    })),
  );
  const stats = await getHomeStats();

  return (
    <section>
      <h1>Startseite</h1>
      <p className="muted">
        Der Hero-Bereich der Startseite. Alles andere (nächster Einsatz, letzte
        Beiträge, Zähler) zieht sich automatisch aus den gepflegten Daten.
      </p>
      <Flash ok={ok} err={err} />

      {data.map(({ code, label, hero, raw }) => (
        <div className="card bracket" key={code} style={{ marginTop: 20 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>{label}</p>
          <form action={saveHomeHero}>
            <input type="hidden" name="locale" value={code} />

            <label className="f">Kicker (kleine Zeile über der Überschrift)</label>
            <input className="f" name="eyebrow" defaultValue={hero.eyebrow} />

            <label className="f">Überschrift (Wörter markieren = Marken-Akzent)</label>
            <RichTextField
              name="headline"
              defaultValue={hero.headlineValue}
              minimal
              ariaLabel={`Überschrift ${label}`}
            />

            <label className="f" style={{ marginTop: 12 }}>Einleitung</label>
            <RichTextField
              name="lead"
              defaultValue={hero.leadValue}
              ariaLabel={`Einleitung ${label}`}
            />

            <label className="f" style={{ marginTop: 12 }}>Rollen (mit Komma trennen)</label>
            <input
              className="f"
              name="roles"
              defaultValue={hero.roles.join(", ")}
              placeholder="ARCHITECT, ADVISOR, DEVELOPER, TRAINER, SPEAKER"
            />

            <label className="f" style={{ marginTop: 12 }}>Hero-Bild</label>
            <AssetPickerField
              name="heroAssetId"
              initialAssetId={raw?.heroAssetId ?? null}
              initialUrl={raw?.heroAsset ? assetUrl(raw.heroAsset.blobPath) : null}
              aspectRatio="4 / 5"
              width={150}
              emptyHint="Kein Bild gewählt — es wird das Standard-Markenbild gezeigt."
            />

            <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>
              {label} speichern
            </button>
          </form>
        </div>
      ))}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Kennzahlen</p>
        <p className="meta" style={{ marginTop: 0 }}>
          Einsätze ({stats.missions}), Länder ({stats.countries}), Briefings
          ({stats.briefings}) und Bücher ({stats.books}) zählt die Startseite
          automatisch. Nur die MVP-Auszeichnungen sind ein Markenfakt:
        </p>
        <form action={saveMvpAwards} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div>
            <label className="f" htmlFor="mvpAwards">MVP Awards (z. B. 7)</label>
            <input id="mvpAwards" className="f" name="mvpAwards" defaultValue={stats.mvpAwards} style={{ maxWidth: 120 }} />
          </div>
          <button className="btn solid sm" type="submit">Speichern</button>
        </form>
      </div>
    </section>
  );
}
