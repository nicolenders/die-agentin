import { SOCIAL_PLATFORMS, getSocialLinks, getShareTemplates } from "@/lib/queries/settings";
import { SHARE_TYPES, SHARE_TYPE_LABEL, shareTemplateKey } from "@/lib/share";
import Flash from "@/components/admin/Flash";
import { saveSocialLinks, saveShareTemplates } from "./config-actions";

export const metadata = { title: "Kanäle · Zentrale" };

// „Kanäle": Social-Media-Profile und die wiedererkennbaren Teilen-Vorlagen.
// Beiträge werden manuell geteilt (Text kopieren + Profil öffnen) — die Vorlagen
// je Typ und Sprache stehen hier.
export default async function KanaelePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const [social, templates] = await Promise.all([getSocialLinks(), getShareTemplates()]);

  return (
    <section>
      <h1>Kanäle</h1>
      <p className="muted">
        Deine Social-Media-Profile und die Vorlagetexte fürs Teilen. Beiträge (Einsätze, Briefings,
        Depeschen) teilst du manuell: im Eintrag auf „Teilen“ klicken, Text kopieren und dein Profil öffnen.
      </p>
      <Flash ok={ok} err={err} />

      <p className="eyebrow" style={{ marginTop: 24 }}>Social-Media-Profile</p>
      <p className="meta">
        Erscheinen als anklickbare Icons im Footer und auf der Legende. Leeres Feld = Link ausgeblendet.
        Ohne vollständige Adresse wird <code>https://</code> ergänzt. GitHub und YouTube werden beim Teilen
        nicht angeboten.
      </p>
      <form action={saveSocialLinks} className="card bracket">
        <div className="grid g2">
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className="f" htmlFor={`social-${p.key}`}>{p.label}</label>
              <input
                id={`social-${p.key}`}
                className="f"
                name={p.key}
                type="url"
                inputMode="url"
                defaultValue={social[p.key] ?? ""}
                placeholder={p.placeholder}
              />
            </div>
          ))}
        </div>
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Profile speichern</button>
      </form>

      <p className="eyebrow" style={{ marginTop: 28 }}>Teilen-Vorlagen</p>
      <p className="meta">
        Ein wiedererkennbarer Text je Typ, auf Deutsch und Englisch. Platzhalter:{" "}
        <code>{"{title}"}</code>, <code>{"{url}"}</code>, <code>{"{identities}"}</code>,{" "}
        <code>{"{city}"}</code> (Einsatz), <code>{"{date}"}</code> (Einsatz). Sind keine Identitäten
        verknüpft, wird <code>{"{identities}"}</code> zu „die Agentin“ / „the Agent“.
      </p>
      <form action={saveShareTemplates}>
        {SHARE_TYPES.map((type) => (
          <div className="card bracket" key={type} style={{ marginBottom: 14 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{SHARE_TYPE_LABEL[type]}</p>
            <div className="grid g2" style={{ marginTop: 10 }}>
              <div>
                <label className="f" htmlFor={`${type}-de`}>Deutsch</label>
                <textarea id={`${type}-de`} className="f" name={shareTemplateKey(type, "de")} rows={4} defaultValue={templates[type].de} />
              </div>
              <div>
                <label className="f" htmlFor={`${type}-en`}>Englisch</label>
                <textarea id={`${type}-en`} className="f" name={shareTemplateKey(type, "en")} rows={4} defaultValue={templates[type].en} />
              </div>
            </div>
          </div>
        ))}
        <button className="btn solid sm" type="submit">Vorlagen speichern</button>
      </form>
    </section>
  );
}
