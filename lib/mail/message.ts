// Aufbau einer RFC-5322-Nachricht. Bewusst klein gehalten: reiner Text, UTF-8,
// keine Anhänge — mehr braucht eine Erinnerungsmail nicht. Getrennt vom
// Versand, damit sich das Ergebnis prüfen lässt, ohne einen Server zu brauchen.

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  date?: Date;
  /** Eindeutige Kennung der Nachricht; sonst wird eine aus Zeit und Absender gebildet. */
  messageId?: string;
}

/**
 * Kodiert eine Kopfzeile nach RFC 2047, sobald sie Zeichen außerhalb von ASCII
 * enthält — ohne das wird aus „Depesche prüfen" beim Empfänger Buchstabensalat.
 */
export function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Zerlegt Base64 in Zeilen à 76 Zeichen (RFC 2045). */
export function chunkBase64(value: string, size = 76): string[] {
  const lines: string[] = [];
  for (let i = 0; i < value.length; i += size) lines.push(value.slice(i, i + size));
  return lines;
}

/** Verhindert, dass eine Zeile aus dem Inhalt die DATA-Phase beendet (RFC 5321 §4.5.2). */
export function dotStuff(line: string): string {
  return line.startsWith(".") ? `.${line}` : line;
}

/** Adresse aus einer Angabe wie `Die Agentin <post@example.com>` herausziehen. */
export function addressOnly(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).trim();
}

/** Baut die vollständige Nachricht mit CRLF-Zeilenenden. */
export function buildMessage(message: MailMessage): string {
  const date = message.date ?? new Date();
  const domain = addressOnly(message.from).split("@")[1] ?? "localhost";
  const id = message.messageId ?? `${date.getTime()}.${Math.abs(hash(message.subject + message.text))}@${domain}`;
  const body = chunkBase64(Buffer.from(message.text, "utf8").toString("base64"));

  const headers = [
    `From: ${encodeHeaderValue(message.from)}`,
    `To: ${encodeHeaderValue(message.to)}`,
    `Subject: ${encodeHeaderValue(message.subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <${id}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    // Automatische Nachricht: hält Abwesenheitsantworten und Schleifen fern.
    "Auto-Submitted: auto-generated",
  ];

  return [...headers, "", ...body].map(dotStuff).join("\r\n");
}

/** Kleiner, stabiler Hash für die Message-ID (kein Sicherheitszweck). */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return h;
}
