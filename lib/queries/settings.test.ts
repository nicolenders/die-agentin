import { describe, it, expect } from "vitest";
import { normalizeSocialUrl, socialSettingKey, SOCIAL_PLATFORMS } from "./settings";

describe("normalizeSocialUrl", () => {
  it("leert bei Leereingabe (entfernt den Link)", () => {
    expect(normalizeSocialUrl("")).toBe("");
    expect(normalizeSocialUrl("   ")).toBe("");
  });

  it("lässt vollständige URLs unverändert", () => {
    expect(normalizeSocialUrl("https://www.linkedin.com/in/nicole")).toBe(
      "https://www.linkedin.com/in/nicole",
    );
    expect(normalizeSocialUrl("http://example.com")).toBe("http://example.com");
  });

  it("ergänzt fehlendes Schema um https://", () => {
    expect(normalizeSocialUrl("www.instagram.com/nicole")).toBe(
      "https://www.instagram.com/nicole",
    );
    expect(normalizeSocialUrl(" x.com/nicole ")).toBe("https://x.com/nicole");
  });
});

describe("socialSettingKey", () => {
  it("erzeugt den Namensraum-Schlüssel", () => {
    expect(socialSettingKey("linkedin")).toBe("social.linkedin");
  });

  it("passt zur Rückabbildung im Footer/Query", () => {
    for (const p of SOCIAL_PLATFORMS) {
      expect(socialSettingKey(p.key).replace(/^social\./, "")).toBe(p.key);
    }
  });
});
