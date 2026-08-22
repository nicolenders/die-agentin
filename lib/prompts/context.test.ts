import { describe, it, expect } from "vitest";
import {
  commonValues,
  countryName,
  dispatchValues,
  identityValues,
  joinAnd,
  joinList,
  missionValues,
  shorten,
  talkValues,
  type IdentityInput,
} from "./context";

function identity(over: Partial<IdentityInput> = {}): IdentityInput {
  return {
    codenameDe: "Die Kartografin",
    codenameEn: "",
    roleDe: "Microsoft-365-Architektin",
    roleEn: "",
    taglineDe: "Ordnung in gewachsenen Landschaften",
    color: "#8B5CF6",
    focus: ["Governance", "Purview"],
    tools: ["Copilot Studio"],
    shortBioDe: "Kurz und knapp.",
    descriptionDe: "",
    ...over,
  };
}

describe("joinAnd", () => {
  it("verbindet zwei Angaben mit „und“", () => {
    expect(joinAnd(["A", "B"])).toBe("A und B");
  });

  it("setzt bei dreien Kommas und ein „und“ vor die letzte", () => {
    expect(joinAnd(["A", "B", "C"])).toBe("A, B und C");
  });

  it("lässt eine einzelne Angabe unverändert", () => {
    expect(joinAnd(["A"])).toBe("A");
  });

  it("übergeht leere Angaben", () => {
    expect(joinAnd(["A", "  ", ""])).toBe("A");
    expect(joinAnd([])).toBe("");
  });
});

describe("joinList", () => {
  it("zählt ohne Bindewort auf und entfernt Dopplungen", () => {
    expect(joinList(["Governance", "Purview", "Governance"])).toBe("Governance, Purview");
  });
});

describe("countryName", () => {
  it("schreibt einen Ländercode aus", () => {
    expect(countryName("DE")).toBe("Deutschland");
  });

  it("liefert nichts bei fehlendem oder unbrauchbarem Code", () => {
    expect(countryName(null)).toBe("");
    expect(countryName("XXX")).toBe("");
  });
});

describe("shorten", () => {
  it("lässt kurze Texte in Ruhe", () => {
    expect(shorten("Kurz", 20)).toBe("Kurz");
  });

  it("kürzt an der Wortgrenze und markiert die Kürzung", () => {
    expect(shorten("eins zwei drei vier", 12)).toBe("eins zwei …");
  });

  it("macht aus mehrzeiligem Text eine Zeile", () => {
    expect(shorten("eins\n\nzwei", 40)).toBe("eins zwei");
  });
});

describe("identityValues", () => {
  it("liefert nichts ohne Auswahl", () => {
    expect(identityValues([])).toEqual({});
  });

  it("nennt eine Identität als Deckname mit Rolle", () => {
    const v = identityValues([identity()]);
    expect(v["identitaet"]).toBe("Die Kartografin (Microsoft-365-Architektin)");
    expect(v["identitaet.farbe"]).toBe("#8B5CF6");
  });

  it("fällt ohne Deckname auf die Rolle zurück und wiederholt sie nicht", () => {
    const v = identityValues([identity({ codenameDe: "" })]);
    expect(v["identitaet"]).toBe("Microsoft-365-Architektin");
  });

  it("verbindet mehrere Identitäten und führt ihre Fachgebiete zusammen", () => {
    const v = identityValues([
      identity(),
      identity({ codenameDe: "Die Kuratorin", roleDe: "Wissensarchitektin", focus: ["Purview", "Suche"], color: "#E879F9" }),
    ]);
    expect(v["identitaet.deckname"]).toBe("Die Kartografin und Die Kuratorin");
    expect(v["identitaet.fokus"]).toBe("Governance, Purview, Suche");
    expect(v["identitaet.farbe"]).toBe("#8B5CF6 und #E879F9");
  });

  it("macht aus einer Beschreibung im Editorformat reinen Text", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Reiner Text." }] }],
    });
    const v = identityValues([identity({ descriptionDe: doc })]);
    expect(v["identitaet.beschreibung"]).toBe("Reiner Text.");
  });
});

describe("missionValues", () => {
  const base = {
    eventName: "European Collaboration Summit",
    city: "Wiesbaden",
    countryCode: "DE",
    isOnline: false,
    startDate: new Date("2026-05-12T09:00:00Z"),
    sessionType: "KEYNOTE",
    languageLabel: "Deutsch",
    durationMin: 45,
    attendeesOnsite: 300,
    attendeesRemote: 120,
    eventUrl: "https://example.org",
    talkTitles: ["Agenten in Produktion"],
    eventTextDe: "",
    talkTextDe: "",
  };

  it("setzt Stadt und Land zu einer Ortsangabe zusammen", () => {
    expect(missionValues(base)["einsatz.ort"]).toBe("Wiesbaden, Deutschland");
  });

  it("schreibt bei Online-Einsätzen „Online“ und lässt Stadt und Land leer", () => {
    const v = missionValues({ ...base, isOnline: true });
    expect(v["einsatz.ort"]).toBe("Online");
    expect(v["einsatz.stadt"]).toBe("");
    expect(v["einsatz.land"]).toBe("");
  });

  it("übersetzt die Art des Auftritts", () => {
    expect(missionValues(base)["einsatz.art"]).toBe("Keynote");
  });

  it("zählt das Publikum vor Ort und zugeschaltet zusammen", () => {
    expect(missionValues(base)["einsatz.publikum"]).toBe("420");
  });

  it("lässt Zahlen leer, wenn sie nicht gepflegt sind", () => {
    const v = missionValues({ ...base, durationMin: null, attendeesOnsite: null, attendeesRemote: null });
    expect(v["einsatz.dauer"]).toBe("");
    expect(v["einsatz.publikum"]).toBe("");
  });
});

describe("talkValues", () => {
  const base = {
    titleDe: "Agenten in Produktion",
    titleEn: "Agents in production",
    abstractDe: "",
    abstractEn: "",
    category: "KI",
    level: "300",
    durationMin: 45,
    audiences: ["IT-Leitung", "IT-Leitung"],
    tools: ["Copilot Studio"],
    deliveryCount: 0,
  };

  it("übernimmt Titel und Stufe", () => {
    const v = talkValues(base);
    expect(v["briefing.titel"]).toBe("Agenten in Produktion");
    expect(v["briefing.stufe"]).toBe("300");
  });

  it("lässt „bisher gehalten“ leer, solange es keinen Auftritt gab", () => {
    expect(talkValues(base)["briefing.einsaetze"]).toBe("");
    expect(talkValues({ ...base, deliveryCount: 3 })["briefing.einsaetze"]).toBe("3");
  });

  it("zählt Zielgruppen ohne Dopplung auf", () => {
    expect(talkValues(base)["briefing.zielgruppen"]).toBe("IT-Leitung");
  });
});

describe("dispatchValues", () => {
  const base = {
    format: "ANALYSIS",
    titleDe: "Was Copilot wirklich kostet",
    titleEn: "",
    summaryDe: "Eine Einordnung.",
    summaryEn: "",
    bodyDe: "",
    bodyEn: "",
    topics: ["Governance"],
    sourceTitle: "Microsoft Learn",
    sourceUrl: "https://learn.microsoft.com",
    publishedAt: new Date("2026-03-02T08:00:00Z"),
    slugDe: "was-copilot-kostet",
    siteUrl: "https://nicolenders.com",
  };

  it("übersetzt das Format", () => {
    expect(dispatchValues(base)["depesche.art"]).toBe("Einordnung");
  });

  it("baut die öffentliche Adresse aus dem Slug", () => {
    expect(dispatchValues(base)["depesche.url"]).toBe(
      "https://nicolenders.com/de/depeschen/was-copilot-kostet",
    );
  });

  it("verbindet Quelle und Adresse", () => {
    expect(dispatchValues(base)["depesche.quelle"]).toBe(
      "Microsoft Learn — https://learn.microsoft.com",
    );
  });

  it("lässt die Adresse leer, solange es keinen Slug gibt", () => {
    expect(dispatchValues({ ...base, slugDe: "" })["depesche.url"]).toBe("");
  });
});

describe("commonValues", () => {
  it("liefert Marke, Jahr und Seitenverhältnis", () => {
    const v = commonValues({
      now: new Date("2026-08-21T10:00:00Z"),
      siteUrl: "https://nicolenders.com/",
      aspect: "4:5",
    });
    expect(v["jahr"]).toBe("2026");
    expect(v["website"]).toBe("nicolenders.com");
    expect(v["format"]).toBe("4:5");
    expect(v["marke"]).toBe("Die Agentin");
  });

  it("lässt das Seitenverhältnis leer, wenn die Vorlage keines vorgibt", () => {
    const v = commonValues({ now: new Date("2026-08-21T10:00:00Z"), siteUrl: "x", aspect: null });
    expect(v["format"]).toBe("");
  });
});
