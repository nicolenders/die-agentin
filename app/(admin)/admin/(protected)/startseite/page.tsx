import { assetUrl } from "@/lib/media/url";
import { getHomeHero, getHomeContentRaw, getHomeStats, getHomeFocusRaw } from "@/lib/queries/home";
import { HOME_FOCUS_MAX, homeFocusRoom } from "@/lib/home-focus";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { Locale } from "@/lib/i18n/config";
import MaskBar from "@/components/admin/MaskBar";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import { saveHomeHero, createHomeFocus, saveHomeFocus, deleteHomeFocus } from "./actions";

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
  const focus = await getHomeFocusRaw();
  const activeFocus = focus.filter((f) => f.active).length;
  const room = homeFocusRoom(activeFocus);

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
              emptyHint="Kein Bild gewählt. Es wird das Standard-Markenbild gezeigt."
            />

            <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>
              {label} speichern
            </button>
          </form>
        </div>
      ))}

      <p className="eyebrow" style={{ marginTop: 34 }}>Woran ich gerade arbeite</p>
      <p className="muted" style={{ marginTop: 0 }}>
        Die Werkzeuge und Themen, mit denen du dich zurzeit besonders beschäftigst. Je
        Eintrag ein kleines Logo und ein Satz. Höchstens {HOME_FOCUS_MAX} Einträge sind
        sichtbar, damit die Reihe auf der Startseite eine Reihe bleibt.{" "}
        {room > 0 ? `Noch ${room} frei.` : "Alle Plätze belegt."}
      </p>

      {focus.map((f) => (
        <div className="card bracket" key={f.id} style={{ marginTop: 16 }}>
          <form action={saveHomeFocus}>
            <input type="hidden" name="id" value={f.id} />
            <div className="grid g2" style={{ alignItems: "start" }}>
              <div>
                <label className="f" htmlFor={`titleDe-${f.id}`}>Titel (DE)</label>
                <input className="f" id={`titleDe-${f.id}`} name="titleDe" defaultValue={f.titleDe} required />
                <label className="f" htmlFor={`textDe-${f.id}`}>Text (DE)</label>
                <textarea className="f" id={`textDe-${f.id}`} name="textDe" rows={3} defaultValue={f.textDe} required />
              </div>
              <div>
                <label className="f" htmlFor={`titleEn-${f.id}`}>Titel (EN, optional)</label>
                <input className="f" id={`titleEn-${f.id}`} name="titleEn" defaultValue={f.titleEn ?? ""} />
                <label className="f" htmlFor={`textEn-${f.id}`}>Text (EN, optional)</label>
                <textarea className="f" id={`textEn-${f.id}`} name="textEn" rows={3} defaultValue={f.textEn ?? ""} />
              </div>
            </div>

            <label className="f" style={{ marginTop: 12 }}>Logo / Bild</label>
            <AssetPickerField
              name="iconAssetId"
              initialAssetId={f.iconAssetId}
              initialUrl={f.icon ? assetUrl(f.icon.blobPath) : null}
              aspectRatio="1 / 1"
              width={72}
              objectFit="contain"
              emptyHint="Kein Logo gewählt"
            />

            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 14 }}>
              <span>
                <label className="f" htmlFor={`sortOrder-${f.id}`} style={{ display: "inline" }}>
                  Reihenfolge
                </label>{" "}
                <input
                  id={`sortOrder-${f.id}`}
                  name="sortOrder"
                  type="number"
                  defaultValue={f.sortOrder}
                  style={{ width: 90 }}
                />
              </span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="active" defaultChecked={f.active} />
                Auf der Startseite zeigen
              </label>
              <button className="btn solid sm" type="submit" style={{ marginLeft: "auto" }}>
                Speichern
              </button>
            </div>
          </form>
          <form action={deleteHomeFocus} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={f.id} />
            <ConfirmButton confirmText={`Eintrag „${f.titleDe}" von der Startseite löschen?`}>
              Löschen
            </ConfirmButton>
          </form>
        </div>
      ))}

      <div className="card bracket" style={{ marginTop: 16 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Neuer Eintrag</p>
        {room === 0 ? (
          <p className="muted" style={{ marginTop: 0 }}>
            Alle {HOME_FOCUS_MAX} Plätze sind belegt. Blende erst einen Eintrag aus oder
            lösche ihn, dann ist wieder Platz.
          </p>
        ) : (
          <form action={createHomeFocus}>
            <div className="grid g2" style={{ alignItems: "start" }}>
              <div>
                <label className="f" htmlFor="new-titleDe">Titel (DE)</label>
                <input className="f" id="new-titleDe" name="titleDe" placeholder="z. B. Copilot Studio" required />
                <label className="f" htmlFor="new-textDe">Text (DE)</label>
                <textarea
                  className="f"
                  id="new-textDe"
                  name="textDe"
                  rows={3}
                  placeholder="Ein Satz: woran du damit gerade arbeitest."
                  required
                />
              </div>
              <div>
                <label className="f" htmlFor="new-titleEn">Titel (EN, optional)</label>
                <input className="f" id="new-titleEn" name="titleEn" />
                <label className="f" htmlFor="new-textEn">Text (EN, optional)</label>
                <textarea className="f" id="new-textEn" name="textEn" rows={3} />
              </div>
            </div>
            <label className="f" style={{ marginTop: 12 }}>Logo / Bild</label>
            <AssetPickerField
              name="iconAssetId"
              initialAssetId={null}
              initialUrl={null}
              aspectRatio="1 / 1"
              width={72}
              objectFit="contain"
              emptyHint="Kein Logo gewählt"
            />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <input type="checkbox" name="active" defaultChecked />
              Auf der Startseite zeigen
            </label>
            <div>
              <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>
                + Eintrag anlegen
              </button>
            </div>
          </form>
        )}
      </div>

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
