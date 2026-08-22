import { describe, it, expect } from "vitest";
import { isPublic } from "./visibility";

const now = new Date("2026-08-11T12:00:00Z");
const past = new Date("2026-08-01T00:00:00Z");
const future = new Date("2026-12-01T00:00:00Z");

describe("isPublic", () => {
  it("is true only for PUBLISHED with a past publishedAt", () => {
    expect(isPublic("PUBLISHED", past, now)).toBe(true);
    expect(isPublic("PUBLISHED", future, now)).toBe(false);
    expect(isPublic("PUBLISHED", null, now)).toBe(false);
    expect(isPublic("SCHEDULED", past, now)).toBe(false);
    expect(isPublic("DRAFT", past, now)).toBe(false);
    expect(isPublic("ARCHIVED", past, now)).toBe(false);
  });
});
