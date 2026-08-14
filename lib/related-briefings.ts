// Reine Logik: verwandte Briefings über gemeinsame Kategorien (gleiches Thema)
// bestimmen und nach Überschneidung ranken. Getrennt und getestet.

/** Kandidaten mit gemeinsamer Kategorie, absteigend nach Überschneidung. */
export function rankRelatedBriefings<T extends { id: string; categoryIds: string[] }>(
  targetCategoryIds: string[],
  candidates: T[],
  limit = 6,
): { item: T; shared: number }[] {
  const target = new Set(targetCategoryIds);
  if (target.size === 0) return [];
  return candidates
    .map((c) => ({ item: c, shared: c.categoryIds.filter((id) => target.has(id)).length }))
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit);
}
