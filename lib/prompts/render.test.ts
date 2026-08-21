import { describe, it, expect } from "vitest";
import { extractPlaceholders, renderPrompt } from "./render";

describe("extractPlaceholders", () => {
  it("findet jeden Platzhalter genau einmal", () => {
    expect(extractPlaceholders("{{a}} {{b.c}} {{a}}")).toEqual(["a", "b.c"]);
  });

  it("verträgt Leerzeichen in den Klammern", () => {
    expect(extractPlaceholders("{{ einsatz.stadt }}")).toEqual(["einsatz.stadt"]);
  });

  it("liefert nichts, wenn es nichts zu ersetzen gibt", () => {
    expect(extractPlaceholders("Ein Text ohne Klammern")).toEqual([]);
  });
});

describe("renderPrompt", () => {
  it("setzt vorhandene Werte ein", () => {
    const r = renderPrompt("Auftritt in {{einsatz.stadt}}.", { "einsatz.stadt": "Berlin" });
    expect(r.text).toBe("Auftritt in Berlin.");
    expect(r.missing).toEqual([]);
  });

  it("meldet fehlende Werte und lässt keinen Klammerrest stehen", () => {
    const r = renderPrompt("Auftritt in {{einsatz.stadt}}.", {});
    expect(r.text).toBe("Auftritt in.");
    expect(r.missing).toEqual(["einsatz.stadt"]);
  });

  it("behandelt leere Werte wie fehlende", () => {
    const r = renderPrompt("{{a}}", { a: "   " });
    expect(r.missing).toEqual(["a"]);
  });

  it("lässt einen Wahlteil ganz weg, wenn ein Platzhalter darin fehlt", () => {
    const r = renderPrompt("Ein Motiv[[ vor {{publikum}} Personen]].", {});
    expect(r.text).toBe("Ein Motiv.");
    expect(r.missing).toEqual(["publikum"]);
  });

  it("behält den Wahlteil ohne die Klammern, wenn alles gefüllt ist", () => {
    const r = renderPrompt("Ein Motiv[[ vor {{publikum}} Personen]].", { publikum: "300" });
    expect(r.text).toBe("Ein Motiv vor 300 Personen.");
  });

  it("prüft jeden Wahlteil für sich", () => {
    const r = renderPrompt("[[A {{a}}]][[ B {{b}}]]", { b: "zwei" });
    expect(r.text).toBe("B zwei");
    expect(r.missing).toEqual(["a"]);
  });

  it("setzt Bausteine ein", () => {
    const r = renderPrompt("Motiv. {{baustein.stil}}", {}, { stil: "Dunkel und ruhig." });
    expect(r.text).toBe("Motiv. Dunkel und ruhig.");
    expect(r.unknownSnippets).toEqual([]);
  });

  it("löst Bausteine auf, die selbst Platzhalter enthalten", () => {
    const r = renderPrompt("{{baustein.stimme}}", { person: "Nicole" }, { stimme: "Wie {{person}}." });
    expect(r.text).toBe("Wie Nicole.");
  });

  it("löst einen Baustein im Baustein auf", () => {
    const r = renderPrompt("{{baustein.a}}", {}, { a: "A und {{baustein.b}}", b: "B" });
    expect(r.text).toBe("A und B");
  });

  it("meldet einen unbekannten Baustein und lässt ihn nicht im Prompt stehen", () => {
    const r = renderPrompt("Motiv. {{baustein.fehlt}}", {}, {});
    expect(r.text).toBe("Motiv.");
    expect(r.unknownSnippets).toEqual(["fehlt"]);
  });

  it("bricht einen Baustein ab, der sich selbst enthält", () => {
    const r = renderPrompt("{{baustein.a}}", {}, { a: "A {{baustein.a}}" });
    expect(r.unknownSnippets).toEqual(["a"]);
    expect(r.text).toBe("A A A");
  });

  it("räumt Leerzeichen und Leerzeilen auf, die durch Wegfall entstehen", () => {
    const r = renderPrompt("Eins.[[ {{a}}]] Zwei.\n\n\n\nDrei.", {});
    expect(r.text).toBe("Eins. Zwei.\n\nDrei.");
  });

  it("lässt keine zwei Satzzeichen aneinanderstoßen, wenn ein Wahlteil wegfällt", () => {
    const r = renderPrompt("Ein Motiv[[ in {{ort}}]]. Weiter.", {});
    expect(r.text).toBe("Ein Motiv. Weiter.");
  });

  it("behält ein Komma, das nach dem Wegfall sinnvoll anschließt", () => {
    const r = renderPrompt("Ein Motiv[[ in {{ort}}]][[, {{datum}}]].", { datum: "12.05.2026" });
    expect(r.text).toBe("Ein Motiv, 12.05.2026.");
  });

  it("entfernt ein Komma, das nach dem Wegfall auf einen Satzpunkt trifft", () => {
    const r = renderPrompt("Ein Motiv.[[ Aufgenommen in {{ort}}]][[, {{datum}}]].", {
      datum: "12.05.2026",
    });
    expect(r.text).toBe("Ein Motiv. 12.05.2026.");
  });

  it("lässt Zahlen mit Punkt unangetastet", () => {
    const r = renderPrompt("Am {{datum}} um 9.30 Uhr.", { datum: "12.05.2026" });
    expect(r.text).toBe("Am 12.05.2026 um 9.30 Uhr.");
  });

  it("nennt jeden fehlenden Platzhalter nur einmal", () => {
    const r = renderPrompt("{{a}} [[{{a}}]] {{a}}", {});
    expect(r.missing).toEqual(["a"]);
  });
});
