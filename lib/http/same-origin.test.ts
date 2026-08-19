import { describe, it, expect, afterEach } from "vitest";
import { isSameOrigin, isSameOriginStrict } from "./same-origin";

function req(headers: Record<string, string>): Request {
  return new Request("https://nicolenders.com/api/track", { method: "POST", headers });
}

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("isSameOrigin", () => {
  it("akzeptiert denselben Host", () => {
    expect(isSameOrigin(req({ origin: "https://nicolenders.com", host: "nicolenders.com" }))).toBe(true);
  });

  it("lehnt fremde Hosts ab", () => {
    expect(isSameOrigin(req({ origin: "https://boese.example", host: "nicolenders.com" }))).toBe(false);
  });

  it("akzeptiert den konfigurierten öffentlichen Host hinter dem Proxy", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nicolenders.com";
    expect(isSameOrigin(req({ origin: "https://nicolenders.com", host: "intern:3000" }))).toBe(true);
  });

  it("akzeptiert x-forwarded-host", () => {
    expect(
      isSameOrigin(
        req({ origin: "https://nicolenders.com", host: "intern:3000", "x-forwarded-host": "nicolenders.com" }),
      ),
    ).toBe(true);
  });

  it("lässt Requests ohne Origin durch (Nicht-Browser-Clients)", () => {
    expect(isSameOrigin(req({ host: "nicolenders.com" }))).toBe(true);
  });

  it("lehnt kaputte Origin-Werte ab", () => {
    expect(isSameOrigin(req({ origin: "nicht-mal-eine-url", host: "nicolenders.com" }))).toBe(false);
  });
});

describe("isSameOriginStrict", () => {
  it("verlangt einen Origin-Header", () => {
    expect(isSameOriginStrict(req({ host: "nicolenders.com" }))).toBe(false);
  });

  it("akzeptiert den eigenen Ursprung", () => {
    expect(
      isSameOriginStrict(req({ origin: "https://nicolenders.com", host: "nicolenders.com" })),
    ).toBe(true);
  });
});
