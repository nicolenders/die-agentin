import { buildMessage, addressOnly, type MailMessage } from "./message";
import { sendViaSmtp, type SmtpConfig } from "./smtp";

// Versandweg für die wenigen Mails, die diese Website verschickt (heute: die
// Erinnerung an ein nahendes Veröffentlichungsdatum). Konfiguration über
// Umgebungsvariablen, damit keine Zugangsdaten im Code oder in der Datenbank
// liegen. Ohne Konfiguration wird nichts verschickt — und das wird gesagt,
// statt still zu scheitern.

export interface MailSettings extends SmtpConfig {
  from: string;
}

export type MailConfigResult =
  | { ok: true; config: MailSettings }
  | { ok: false; error: string };

function env(key: string): string {
  return (process.env[key] ?? "").trim();
}

/** Liest die Versandeinstellungen aus der Umgebung. */
export function readMailConfig(source: Record<string, string | undefined> = process.env): MailConfigResult {
  const get = (key: string) => (source[key] ?? "").trim();
  const host = get("SMTP_HOST");
  const from = get("SMTP_FROM");
  if (!host || !from) {
    return {
      ok: false,
      error:
        "Kein Mailversand eingerichtet: SMTP_HOST und SMTP_FROM fehlen in der Umgebung. Erinnerungen bleiben aus, bis beides gesetzt ist.",
    };
  }
  const portRaw = Number.parseInt(get("SMTP_PORT") || "587", 10);
  const port = Number.isFinite(portRaw) ? portRaw : 587;
  const secureRaw = get("SMTP_SECURE").toLowerCase();
  const secure = secureRaw ? secureRaw === "true" || secureRaw === "1" : port === 465;
  return {
    ok: true,
    config: {
      host,
      port,
      secure,
      user: get("SMTP_USER") || undefined,
      password: get("SMTP_PASSWORD") || undefined,
      from,
    },
  };
}

/** Ist ein Mailversand überhaupt eingerichtet? Für Hinweise in der Oberfläche. */
export function isMailConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_FROM"));
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Verschickt eine Textmail. Fehler werden gemeldet, nicht geworfen. */
export async function sendMail(message: Omit<MailMessage, "from">): Promise<SendResult> {
  const config = readMailConfig();
  if (!config.ok) return { ok: false, error: config.error };
  const full: MailMessage = { ...message, from: config.config.from };
  try {
    await sendViaSmtp(config.config, {
      from: addressOnly(config.config.from),
      to: addressOnly(message.to),
      data: buildMessage(full),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mailversand fehlgeschlagen." };
  }
}
