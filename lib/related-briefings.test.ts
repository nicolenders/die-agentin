import { describe, it, expect } from "vitest";
import { rankRelatedBriefings } from "./related-briefings";

describe("rankRelatedBriefings", () => {
  const candidates = [
    { id: "a", categoryIds: ["ai", "cloud"] },
    { id: "b", categoryIds: ["ai"] },
    { id: "c", categoryIds: ["security"] },
    { id: "d", categoryIds: ["ai", "cloud", "data"] },
  ];

  it("ranks by number of shared categories, drops non-overlapping", () => {
    const ranked = rankRelatedBriefings(["ai", "cloud"], candidates);
    expect(ranked.map((r) => r.item.id)).toEqual(["a", "d", "b"]);
    expect(ranked[0]!.shared).toBe(2);
    expect(ranked.find((r) => r.item.id === "c")).toBeUndefined();
  });

  it("returns empty when the target has no categories", () => {
    expect(rankRelatedBriefings([], candidates)).toEqual([]);
  });

  it("honors the limit", () => {
    expect(rankRelatedBriefings(["ai"], candidates, 1)).toHaveLength(1);
  });
});
