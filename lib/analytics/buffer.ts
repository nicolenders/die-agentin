// Zwischenspeicher für Seitenaufrufe.
//
// Warum: Jeder Seitenaufruf schrieb bisher sofort eine Zeile in die Datenbank.
// Die ist serverlos und pausiert bei Ruhe — ein einziger Besucher hat sie damit
// geweckt und für die Dauer des Auto-Pause-Delays wachgehalten. Bei ein paar
// Aufrufen über den Tag verteilt war die Datenbank durchgehend online und
// wurde entsprechend abgerechnet (docs/decisions/0032-kosten-der-laufzeit.md).
//
// Reichweitenzahlen sind kein Kassenbuch: Sie dürfen ein paar Stunden später
// in der Ablage landen, und ein verlorener Eintrag beim Neustart ist zu
// verschmerzen. Deshalb sammeln, und im Sammelfenster des Jobs gebündelt
// schreiben (lib/jobs/tick-plan.ts).

export interface BufferedPageview {
  day: Date;
  path: string;
  locale: string;
  section: string;
  country: string;
  visitorHash: string;
}

/** Notbremse gegen unbegrenztes Wachstum, falls der Job nie abholt. */
export const MAX_BUFFERED = 5000;

let buffer: BufferedPageview[] = [];
let dropped = 0;

/** Legt einen Aufruf ab und gibt die neue Füllhöhe zurück. */
export function bufferPageview(entry: BufferedPageview): number {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFERED) {
    // Die ältesten fallen heraus: die jüngsten Zahlen sind die nützlicheren.
    dropped += buffer.length - MAX_BUFFERED;
    buffer = buffer.slice(-MAX_BUFFERED);
  }
  return buffer.length;
}

export function bufferedCount(): number {
  return buffer.length;
}

/** Wie viele Aufrufe die Notbremse bisher verworfen hat. */
export function droppedCount(): number {
  return dropped;
}

/** Nimmt alles heraus. Der Aufrufer ist ab jetzt dafür verantwortlich. */
export function takeBufferedPageviews(): BufferedPageview[] {
  const taken = buffer;
  buffer = [];
  return taken;
}

/** Legt Einträge zurück, wenn das Schreiben fehlgeschlagen ist. */
export function returnBufferedPageviews(entries: BufferedPageview[]): void {
  if (entries.length === 0) return;
  buffer = [...entries, ...buffer].slice(-MAX_BUFFERED);
}

/** Nur für Tests. */
export function resetPageviewBuffer(): void {
  buffer = [];
  dropped = 0;
}
