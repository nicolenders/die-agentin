import { db } from "@/lib/db";
import { PLATFORMS, type Platform } from "@/lib/domain";
import { expiryState, daysUntil } from "@/lib/channels/expiry";
import { formatDateTime } from "@/lib/format";
import ManualShareCard from "@/components/admin/ManualShareCard";
import { setChannelConnected, disconnectLinkedIn, retryTask } from "./actions";

export const metadata = { title: "Zeitplan & Kanäle · Zentrale" };

const PLATFORM_LABEL: Record<Platform, string> = {
  LINKEDIN: "LinkedIn",
  X: "X",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
};

function parsePayload(payload: string): { text: string; url: string } {
  try {
    const p = JSON.parse(payload) as { text?: string; url?: string };
    return { text: p.text ?? "", url: p.url ?? "" };
  } catch {
    return { text: "", url: "" };
  }
}

export default async function KanaelePage() {
  let accounts: Awaited<ReturnType<typeof db.channelAccount.findMany>> = [];
  let manualTasks: Awaited<ReturnType<typeof db.channelTask.findMany>> = [];
  let failedTasks: typeof manualTasks = [];
  let dbError = false;
  try {
    accounts = await db.channelAccount.findMany();
    manualTasks = await db.channelTask.findMany({ where: { state: "MANUAL_OPEN" }, orderBy: { scheduledAt: "asc" } });
    failedTasks = await db.channelTask.findMany({ where: { state: "FAILED" }, orderBy: { scheduledAt: "asc" } });
  } catch {
    dbError = true;
  }

  const byPlatform = new Map(accounts.map((a) => [a.platform, a]));

  return (
    <section>
      <h1>Zeitplan &amp; Kanäle</h1>
      <p className="muted">Der Zustand der Verbindungen und offene Ein-Klick-Aufgaben.</p>

      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <p className="eyebrow" style={{ marginTop: 20 }}>Kanäle</p>
      <div className="grid g3">
        {PLATFORMS.map((platform) => {
          const account = byPlatform.get(platform);
          const connected = account?.connected ?? false;
          const state = expiryState(account?.expiresAt ?? null);
          const days = daysUntil(account?.expiresAt ?? null);
          return (
            <div className="card bracket" key={platform}>
              <p className="eyebrow">{PLATFORM_LABEL[platform]}</p>
              {connected ? (
                <span className={`st ${state === "expired" ? "err" : state === "warn" ? "sched" : "live"}`}>
                  {state === "expired" ? "Abgelaufen" : "Verbunden"}
                </span>
              ) : account?.lastError ? (
                <span className="st err">Fehler</span>
              ) : (
                <span className="st draft">Nicht verbunden</span>
              )}

              {platform === "LINKEDIN" && connected && state === "warn" ? (
                <p className="meta" style={{ marginTop: 10, color: "var(--warn)" }}>
                  Zugriff läuft in {days} Tagen ab — bitte neu autorisieren.
                </p>
              ) : null}
              {account?.lastError ? <p className="meta" style={{ marginTop: 10, color: "var(--danger)" }}>{account.lastError}</p> : null}

              <div style={{ marginTop: 10 }}>
                {platform === "LINKEDIN" ? (
                  connected ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {/* Vollständige Navigation zum OAuth-Endpunkt (Route Handler), kein next/link. */}
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a className="btn ghost sm" href="/api/admin/channels/linkedin/authorize">Neu autorisieren</a>
                      <form action={disconnectLinkedIn}>
                        <button className="btn ghost sm" type="submit">Trennen</button>
                      </form>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-html-link-for-pages
                    <a className="btn ghost sm" href="/api/admin/channels/linkedin/authorize">Verbinden</a>
                  )
                ) : (
                  <form action={setChannelConnected}>
                    <input type="hidden" name="platform" value={platform} />
                    <input type="hidden" name="connected" value={connected ? "false" : "true"} />
                    <button className="btn ghost sm" type="submit">{connected ? "Deaktivieren" : "Aktivieren"}</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {manualTasks.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 28 }}>Ein-Klick-Freigaben</p>
          {manualTasks.map((t) => {
            const { text, url } = parsePayload(t.payload);
            return <ManualShareCard key={t.id} id={t.id} platform={PLATFORM_LABEL[t.platform as Platform] ?? t.platform} text={text} url={url} />;
          })}
        </>
      ) : null}

      {failedTasks.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 28 }}>Fehlgeschlagen</p>
          {failedTasks.map((t) => (
            <div className="card bracket" key={t.id} style={{ marginBottom: 12, borderLeft: "2px solid var(--danger)" }}>
              <b>{PLATFORM_LABEL[t.platform as Platform] ?? t.platform}</b>
              <div className="meta">{formatDateTime(t.scheduledAt, "de")} · {t.lastError ?? "Fehler"}</div>
              <form action={retryTask} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={t.id} />
                <button className="btn ghost sm" type="submit">Erneut senden</button>
              </form>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
