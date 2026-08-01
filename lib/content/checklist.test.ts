import { describe, it, expect } from "vitest";
import { buildChecklist } from "./checklist";

const green = {
  deTitle: "Titel",
  deSummary: "Zusammenfassung",
  hasGermanBody: true,
  imagesWithoutAlt: 0,
  enPresent: true,
};

describe("content/checklist", () => {
  it("ist grün und veröffentlichbar, wenn alles gesetzt ist", () => {
    const r = buildChecklist(green);
    expect(r.canPublish).toBe(true);
    expect(r.items.every((i) => i.level === "ok")).toBe(true);
  });

  it("blockiert ohne Titel/Summary", () => {
    const r = buildChecklist({ ...green, deTitle: "", deSummary: "" });
    expect(r.canPublish).toBe(false);
  });

  it("blockiert bei Bildern ohne Alt-Text", () => {
    const r = buildChecklist({ ...green, imagesWithoutAlt: 2 });
    expect(r.canPublish).toBe(false);
    expect(r.items.find((i) => i.key === "altText")?.label).toContain("2");
  });

  it("blockiert ohne deutsche Fassung", () => {
    expect(buildChecklist({ ...green, hasGermanBody: false }).canPublish).toBe(false);
  });

  it("fehlendes EN ist nur eine Warnung, kein Blocker", () => {
    const r = buildChecklist({ ...green, enPresent: false });
    expect(r.canPublish).toBe(true);
    expect(r.items.find((i) => i.key === "english")?.level).toBe("warn");
  });
});
