import { describe, it, expect } from "vitest";
import { planTalkMerge, suggestMergeTarget, type MergeTalk } from "./merge";

function talk(id: string, over: Partial<MergeTalk> = {}): MergeTalk {
  return {
    id,
    translations: [],
    categoryIds: [],
    audienceIds: [],
    identityIds: [],
    toolIds: [],
    deliveryIds: [],
    ...over,
  };
}

describe("planTalkMerge", () => {
  // Der Fall aus Audit 4.3: dieselbe Session, je Sprache ein eigenes Briefing.
  const de = talk("hr-de", {
    translations: [{ locale: "de", title: "HR Companion", abstract: "Bot mit Foundry." }],
    deliveryIds: ["d1", "d2", "d3"],
    categoryIds: ["agentic"],
    identityIds: ["agentenfuehrerin"],
  });
  const en = talk("hr-en", {
    translations: [{ locale: "en", title: "HR Companion Reimagined", abstract: "Enterprise agents." }],
    deliveryIds: ["d4", "d5"],
    categoryIds: ["copilot"],
    toolIds: ["foundry"],
  });

  it("hängt alle Einsätze der Quelle ans Ziel", () => {
    expect(planTalkMerge(en, de).moveDeliveryIds).toEqual(["d4", "d5"]);
  });

  it("übernimmt die fehlende Sprachfassung", () => {
    const plan = planTalkMerge(en, de);
    expect(plan.addTranslations).toEqual([
      { locale: "en", title: "HR Companion Reimagined", abstract: "Enterprise agents." },
    ]);
  });

  it("überschreibt eine vorhandene Sprachfassung des Ziels nicht", () => {
    const zielMitEn = talk("ziel", {
      translations: [
        { locale: "de", title: "Gepflegt DE", abstract: null },
        { locale: "en", title: "Gepflegt EN", abstract: null },
      ],
    });
    const plan = planTalkMerge(en, zielMitEn);
    expect(plan.addTranslations).toEqual([]);
  });

  it("vereinigt Verknüpfungen ohne Dubletten", () => {
    const plan = planTalkMerge(en, de);
    expect(plan.categoryIds).toEqual(["agentic", "copilot"]);
    expect(plan.identityIds).toEqual(["agentenfuehrerin"]);
    expect(plan.toolIds).toEqual(["foundry"]);
  });

  it("verweigert die Zusammenführung mit sich selbst", () => {
    expect(() => planTalkMerge(de, de)).toThrow();
  });
});

describe("suggestMergeTarget", () => {
  it("behält den Datensatz mit den meisten Einsätzen", () => {
    // Audit 4.2: der Datensatz mit deliveryCount = 1 bleibt, der mit 0 geht.
    const gehalten = talk("mit-count", { deliveryIds: ["d1"] });
    const leer = talk("ohne-count");
    expect(suggestMergeTarget(leer, gehalten).id).toBe("mit-count");
    expect(suggestMergeTarget(gehalten, leer).id).toBe("mit-count");
  });

  it("entscheidet bei Gleichstand nach Sprachfassungen", () => {
    const einsprachig = talk("a", { translations: [{ locale: "de", title: "A", abstract: null }] });
    const zweisprachig = talk("b", {
      translations: [
        { locale: "de", title: "B", abstract: null },
        { locale: "en", title: "B", abstract: null },
      ],
    });
    expect(suggestMergeTarget(einsprachig, zweisprachig).id).toBe("b");
  });
});
