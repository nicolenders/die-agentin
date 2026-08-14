// Reine Helfer für Mehrfach-Filter in der URL (z. B. Identitätsfilter der
// Einsätze). Getrennt und getestet, weil die Seiten sie server- wie clientseitig
// nutzen.

/** Komma-getrennten Query-Wert in eine bereinigte, duplikatfreie Liste zerlegen. */
export function parseCsvParam(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Wert in einer Auswahl umschalten (hinzufügen, wenn fehlend; sonst entfernen). */
export function toggleCsv(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
}
