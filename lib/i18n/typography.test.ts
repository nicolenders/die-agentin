import { describe, it, expect } from "vitest";
import de from "./dictionaries/de";
import en from "./dictionaries/en";

// Audit 3.4: Geviertstriche (—) sind in deutschem Fließtext orthografisch
// falsch und werden als KI-Marker gelesen. Der Test hält sie aus den
// Wörterbüchern heraus — der Ort, an dem nutzersichtbarer Text am schnellsten
// wieder hineinwandert. Erlaubt bleibt der Halbgeviertstrich (–) mit
// Leerzeichen, wo ein Einschub wirklich trägt.

type Entry = [path: string, value: string];

function collectStrings(value: unknown, path = ""): Entry[] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, v]) =>
      collectStrings(v, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe.each([
  ["de", de],
  ["en", en],
])("Typografie (%s)", (locale, dict) => {
  const entries = collectStrings(dict);

  it("erfasst überhaupt Strings", () => {
    expect(entries.length).toBeGreaterThan(50);
  });

  it("enthält keinen Geviertstrich", () => {
    const offenders = entries.filter(([, value]) => value.includes("—"));
    expect(offenders.map(([path]) => `${locale}.${path}`)).toEqual([]);
  });

  it("nutzt den Halbgeviertstrich nur mit Leerzeichen auf beiden Seiten", () => {
    const offenders = entries.filter(([, value]) => /\S–|–\S/.test(value));
    expect(offenders.map(([path]) => `${locale}.${path}`)).toEqual([]);
  });
});
