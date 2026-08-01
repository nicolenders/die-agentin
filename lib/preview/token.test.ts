import { describe, it, expect, beforeAll } from "vitest";
import { createPreviewToken, verifyPreviewToken } from "./token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-preview";
});

describe("preview/token", () => {
  it("erzeugt ein Token, das sich verifizieren lässt", () => {
    const now = 1_000_000;
    const token = createPreviewToken("post", "abc", now);
    const payload = verifyPreviewToken(token, now + 1000);
    expect(payload?.id).toBe("abc");
    expect(payload?.kind).toBe("post");
  });

  it("weist abgelaufene Token ab", () => {
    const now = 1_000_000;
    const token = createPreviewToken("post", "abc", now, 5000);
    expect(verifyPreviewToken(token, now + 6000)).toBeNull();
  });

  it("weist manipulierte Token ab", () => {
    const token = createPreviewToken("post", "abc", 1000);
    const tampered = token.slice(0, -3) + "xxx";
    expect(verifyPreviewToken(tampered, 2000)).toBeNull();
  });

  it("weist Müll ab", () => {
    expect(verifyPreviewToken("nonsense", 1)).toBeNull();
    expect(verifyPreviewToken("a.b.c", 1)).toBeNull();
  });
});
