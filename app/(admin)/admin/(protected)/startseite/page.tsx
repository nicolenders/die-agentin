import { assetUrl } from "@/lib/media/url";
import { getHomeHero, getHomeContentRaw, getHomeStats, getHomeFocusRaw } from "@/lib/queries/home";
import { HOME_FOCUS_MAX, homeFocusRoom } from "@/lib/home-focus";
import type { Locale } from "@/lib/i18n/config";
import Flash from "@/components/admin/Flash";
import InfoPopover from "@/components/admin/InfoPopover";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import HomeFocusTable from "@/components/admin/HomeFocusTable";
import {
  saveHomeHero,
  saveHomeImage,
  createHomeFocus,
  saveHomeFocus,
  deleteHomeFocus,
} from "./actions";

export const metadata = { title: "Startseite · Zentrale" };

const LOCALES: { code: Locale; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "Englisch" },
];

// Register statt einer Endlosseite. Der aktive Tab steht in der URL, damit er
// das Speichern und den Rücksprung übersteht.
const TABS = [
  { id: "texte-de", label: "Texte (DE)" },
  { id: "texte-en", label: "Texte (EN)" },
  { id: "bild", label: "Bild" },
  { id: "fokus", label: "Woran ich gerade arbeite" },
] as const;

export default async function StartseiteAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string }>;
}) {
  const { ok, err, tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "texte-de";

  const [heroDe, heroEn, rawDe, rawEn, stats, focus] = await Promise.all([
    getHomeHero("de"),
    getHomeHero("en"),
    getHomeContentRaw("de"),
    getHomeContentRaw("en"),
    getHomeStats(),
    getHomeFocusRaw(),
  ]);
  const heroes = { de: heroDe, en: heroEn };
  // Das Bild wird ab jetzt auf beide Sprachzeilen geschrieben. Altbestand kann
  // es nur an der englischen hängen haben — dann wird es hier gezeigt und beim
  // nächsten Speichern auf beide gesetzt, statt still zu verschwinden.
  const heroImageRow = rawDe?.heroAssetId ? rawDe : rawEn?.heroAssetId ? rawEn : rawDe;
  const activeFocus = focus.filter((f) => f.active).length;
  const room = homeFocusRoom(activeFocus);

  // Die Kennzahlen rechnen sich aus den Daten — nichts davon wird hier
  // gepflegt. Deshalb stehen sie als Information hinter dem Info-Icon und nicht
  // als vermeintliches Formular zwischen den Registern.
  const infoSections = [
    {
      heading: "Kennzahlen (automatisch)",
      text: `Alle Zähler ziehen sich aus den Daten: Einsätze (${stats.missions}), Länder (${stats.countries}), Briefings (${stats.briefings}), Bücher (${stats.books}) und MVP-Auszeichnungen (${stats.mvpAwards}).`,
    },
    {
      heading: "Woher die MVP-Zahl kommt",
      text: "Gezählt werden die Einträge unter „Ausbildung & Auszeichnungen“, die zur Art „MVP“ gehören — je ein Eintrag pro Jahr ergibt die Zahl von selbst.",
    },
    {
      heading: "Was sich sonst automatisch füllt",
      text: "Nächster Einsatz, letzte Depeschen und die Zähler unten auf der Startseite stammen aus den gepflegten Daten. Hier stehen nur der Hero-Bereich, das Bild und „Woran ich gerade arbeite“.",
    },
  ];

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Startseite</h1>
        <div style={{ marginLeft: "auto" }}>
          <InfoPopover title="Kennzahlen & Automatik" sections={infoSections} />
        </div>
      </div>
      <Flash ok={ok} err={err} />

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <a
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`tab${t.id === active ? " active" : ""}`}
            href={`/admin/startseite?tab=${t.id}`}
          >
            {t.label}
            {t.id === "fokus" ? <span className="tab-count">{focus.length}</span> : null}
          </a>
        ))}
      </div>

      {LOCALES.map(({ code, label }) => {
        if (active !== `texte-${code}`) return null;
        const hero = heroes[code];
        return (
          <div className="card bracket" key={code} style={{ marginTop: 20 }}>
            <form action={saveHomeHero}>
              <input type="hidden" name="locale" value={code} />

              <label className="f">Kicker (kleine Zeile über der Überschrift)</label>
              <input className="f" name="eyebrow" defaultValue={hero.eyebrow} />

              <label className="f">Überschrift (Wörter markieren = Marken-Akzent)</label>
              <RichTextField name="headline" defaultValue={hero.headlineValue} minimal ariaLabel={`Überschrift ${label}`} />

              <label className="f" style={{ marginTop: 12 }}>Einleitung</label>
              <RichTextField name="lead" defaultValue={hero.leadValue} ariaLabel={`Einleitung ${label}`} />

              <label className="f" style={{ marginTop: 12 }}>Rollen (mit Komma trennen)</label>
              <input
                className="f"
                name="roles"
                defaultValue={hero.roles.join(", ")}
                placeholder="ARCHITECT, ADVISOR, DEVELOPER, TRAINER, SPEAKER"
              />

              <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>
                {label} speichern
              </button>
            </form>
          </div>
        );
      })}

      {active === "bild" ? (
        <div className="card bracket" style={{ marginTop: 20, maxWidth: 520 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>Hero-Bild</p>
          <p className="meta" style={{ marginTop: 0 }}>
            Das Bild ist sprachunabhängig: dasselbe Motiv steht auf der deutschen und der
            englischen Startseite. Einmal wählen genügt. Ohne Bild greift das Standard-Markenbild.
          </p>
          <form action={saveHomeImage}>
            <AssetPickerField
              name="heroAssetId"
              initialAssetId={heroImageRow?.heroAssetId ?? null}
              initialUrl={heroImageRow?.heroAsset ? assetUrl(heroImageRow.heroAsset.blobPath) : null}
              aspectRatio="4 / 5"
              width={180}
              emptyHint="Kein Bild gewählt. Es wird das Standard-Markenbild gezeigt."
            />
            <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>Bild speichern</button>
          </form>
        </div>
      ) : null}

      {active === "fokus" ? (
        <div style={{ marginTop: 20 }}>
          <HomeFocusTable
            rows={focus.map((f) => ({
              id: f.id,
              titleDe: f.titleDe,
              titleEn: f.titleEn ?? "",
              textDe: f.textDe,
              textEn: f.textEn ?? "",
              iconAssetId: f.iconAssetId,
              iconUrl: f.icon ? assetUrl(f.icon.blobPath) : null,
              active: f.active,
              sortOrder: f.sortOrder,
            }))}
            saveAction={saveHomeFocus}
            createAction={createHomeFocus}
            deleteAction={deleteHomeFocus}
            roomLeft={room}
            max={HOME_FOCUS_MAX}
          />
        </div>
      ) : null}
    </section>
  );
}
