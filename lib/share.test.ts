import { describe, it, expect } from "vitest";
import {
  shareTemplateKey,
  joinIdentities,
  renderShareText,
  shareableProfiles,
  DEFAULT_SHARE_TEMPLATES,
} from "./share";

describe("shareTemplateKey", () => {
  it("builds a stable settings key per type + locale", () => {
    expect(shareTemplateKey("mission", "de")).toBe("share.template.mission.de");
    expect(shareTemplateKey("dispatch", "en")).toBe("share.template.dispatch.en");
  });
});

describe("joinIdentities", () => {
  it("joins with commas and & and falls back when empty", () => {
    expect(joinIdentities([], "de")).toBe("die Agentin");
    expect(joinIdentities([], "en")).toBe("the Agent");
    expect(joinIdentities(["Die Verbinderin"], "de")).toBe("Die Verbinderin");
    expect(joinIdentities(["A", "B"], "de")).toBe("A & B");
    expect(joinIdentities(["A", "B", "C"], "de")).toBe("A, B & C");
    expect(joinIdentities([" A ", "", "  "], "de")).toBe("A");
  });
});

describe("renderShareText", () => {
  it("substitutes known tokens and leaves unknown ones", () => {
    const out = renderShareText(
      "„{title}“ in {city} als {identities}: {url} {unknown}",
      { title: "Talk", url: "https://x.de/a", identities: ["Die Konstrukteurin"], city: "Berlin" },
      "de",
    );
    expect(out).toContain("„Talk“ in Berlin als Die Konstrukteurin: https://x.de/a");
    expect(out).toContain("{unknown}");
  });
  it("uses the identity fallback when none linked", () => {
    expect(renderShareText("als {identities}", { title: "", url: "", identities: [] }, "de")).toBe(
      "als die Agentin",
    );
  });
  it("collapses double spaces left by empty tokens", () => {
    expect(renderShareText("in {city} da", { title: "", url: "", identities: [], city: "" }, "de")).toBe(
      "in da",
    );
  });
  it("default templates contain the link placeholder", () => {
    for (const type of ["mission", "briefing", "dispatch"] as const) {
      expect(DEFAULT_SHARE_TEMPLATES[type].de).toContain("{url}");
      expect(DEFAULT_SHARE_TEMPLATES[type].en).toContain("{url}");
    }
  });
});

describe("shareableProfiles", () => {
  it("keeps maintained profiles but drops github, youtube and empties", () => {
    const result = shareableProfiles({
      linkedin: "https://linkedin.com/in/x",
      instagram: "  ",
      github: "https://github.com/x",
      youtube: "https://youtube.com/@x",
      x: "https://x.com/x",
    });
    expect(result.map((p) => p.key).sort()).toEqual(["linkedin", "x"]);
  });
});
