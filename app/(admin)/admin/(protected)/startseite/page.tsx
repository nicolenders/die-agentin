import { assetUrl } from "@/lib/media/url";
import { getHomeHero, getHomeContentRaw, getHomeStats } from "@/lib/queries/home";
import type { Locale } from "@/lib/i18n/config";
import MaskBar from "@/components/admin/MaskBar";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import { saveHomeHero } from "./actions";

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
      <MaskBar title="Startseite" ok={ok} err={err}>
        {data.map(({ code, label }) => (
          <button key={code} className="btn solid sm" type="submit" form={`home-${code}`}>
            {label} speichern
          </button>
        ))}
      </MaskBar>
      <p className="muted">
        Der Hero-Bereich der Startseite. Alles andere (nächster Einsatz, letzte
        Beiträge, Zähler) zieht sich automatisch aus den gepflegten Daten.
      </p>

      {data.map(({ code, label, hero, raw }) => (
        <div className="card bracket" key={code} style={{ marginTop: 20 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>{label}</p>
          <form action={saveHomeHero} id={`home-${code}`}>
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
        <p className="eyebrow" style={{ marginTop: 0 }}>Kennzahlen (automatisch)</p>
        <p className="meta" style={{ marginTop: 0 }}>
          Alle Zähler ziehen sich aus den Daten: Einsätze ({stats.missions}),
          Länder ({stats.countries}), Briefings ({stats.briefings}), Bücher
          ({stats.books}) und MVP-Auszeichnungen ({stats.mvpAwards}). Die
          MVP-Zahl zählt die Einträge unter <b>Publikationen &amp; Ausbildung</b>,
          die zur Reihe/Kategorie „MVP“ gehören.
        </p>
      </div>
    </section>
  );
}
