import { db } from "@/lib/db";
import { SOCIAL_PLATFORMS, getSocialLinks, getShareTemplates } from "@/lib/queries/settings";
import { SHARE_TYPES, SHARE_TYPE_LABEL, shareTemplateKey } from "@/lib/share";
import { expiryState, daysUntil } from "@/lib/channels/expiry";
import Flash from "@/components/admin/Flash";
import { saveSocialLinks, saveShareTemplates } from "./config-actions";
import { disconnectLinkedIn } from "./actions";

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

  const linkedinConfigured = Boolean(process.env.LINKEDIN_CLIENT_ID);
  let linkedin: { connected: boolean; expiresAt: Date | null; lastError: string | null } | null = null;
  try {
    const a = await db.channelAccount.findUnique({ where: { platform: "LINKEDIN" } });
    if (a) linkedin = { connected: a.connected, expiresAt: a.expiresAt, lastError: a.lastError };
  } catch {
    // DB nicht erreichbar → Verbindungsblock zeigt „nicht verbunden"
  }
  const liState = expiryState(linkedin?.expiresAt ?? null);
  const liDays = daysUntil(linkedin?.expiresAt ?? null);

  return (
    <section>
      <h1>Kanäle</h1>
      <p className="muted">
        Deine Social-Media-Profile und die Vorlagetexte fürs Teilen. Beiträge (Einsätze, Briefings,
        Depeschen) teilst du manuell: im Eintrag auf „Teilen“ klicken, Text kopieren und dein Profil öffnen.
      </p>
      <Flash ok={ok} err={err} />

      <p className="eyebrow" style={{ marginTop: 24 }}>LinkedIn — direkt veröffentlichen</p>
      <p className="meta">
        Zusätzlich zum manuellen Teilen kannst du einen Beitrag direkt auf LinkedIn veröffentlichen
        (im Eintrag über „Teilen“). Dafür LinkedIn einmalig verbinden. Du entscheidest pro Beitrag,
        welchen Weg du nutzt.
      </p>
      <div className="card bracket">
        {!linkedinConfigured ? (
          <p className="meta" style={{ margin: 0, color: "var(--warn)" }}>
            LinkedIn-App noch nicht eingerichtet (Client ID/Secret fehlen). Bis dahin geht nur der manuelle Weg.
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {linkedin?.connected && liState !== "expired" ? (
              <span className="st live">Verbunden</span>
            ) : linkedin?.connected && liState === "expired" ? (
              <span className="st err">Abgelaufen</span>
            ) : (
              <span className="st draft">Nicht verbunden</span>
            )}
            {linkedin?.connected && liState === "warn" ? (
              <span className="meta" style={{ color: "var(--warn)" }}>Zugriff läuft in {liDays} Tagen ab.</span>
            ) : null}
            {linkedin?.lastError ? <span className="meta" style={{ color: "var(--danger)" }}>{linkedin.lastError}</span> : null}
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {/* Vollständige Navigation zum OAuth-Endpunkt (Route Handler), kein next/link. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="btn ghost sm" href="/api/admin/channels/linkedin/authorize">
                {linkedin?.connected ? "Neu autorisieren" : "Verbinden"}
              </a>
              {linkedin?.connected ? (
                <form action={disconnectLinkedIn} style={{ display: "inline" }}>
                  <button className="btn ghost sm" type="submit">Trennen</button>
                </form>
              ) : null}
            </span>
          </div>
        )}
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Social-Media-Profile</p>
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
