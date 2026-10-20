import { db } from "@/lib/db";
import { toPoolImage, type PoolImage } from "@/lib/dispatches/images";

// Lesen des Bilder-Pools (ADR 0033) — bewusst getrennt von der Depesche selbst.
//
// Der Pool kam im selben Deploy wie seine Tabelle. Läuft die Migration beim
// Start nicht durch (Datenbank pausiert, Sperre, gescheiterter Vorgänger in
// der Kette), fehlt `DispatchImage`, und jede Abfrage, die den Pool mitlädt,
// wirft. Hing er an der Depeschen-Abfrage, war damit die ganze Maske tot —
// genau das ist am 20.10.2026 passiert. Jetzt fällt nur der Pool aus: `null`
// heißt „nicht verfügbar", die Maske bleibt bedienbar.

/** Pool einer Depesche; `null`, wenn die Tabelle (noch) nicht lesbar ist. */
export async function loadDispatchPool(dispatchId: string | null): Promise<PoolImage[] | null> {
  try {
    if (!dispatchId) {
      // Neue Depesche: nur prüfen, ob die Tabelle da ist.
      await db.dispatchImage.findFirst({ select: { id: true } });
      return [];
    }
    const rows = await db.dispatchImage.findMany({
      where: { dispatchId },
      orderBy: { sortOrder: "asc" },
      include: { asset: true },
    });
    return rows.map((r) => toPoolImage(r.asset));
  } catch (error) {
    console.error("[dispatch-images] Bilder-Pool nicht lesbar — Migration 20261006120000_dispatch_images angewandt?", error);
    return null;
  }
}

/** Alle Pool-Zuordnungen für den Verwendungsnachweis; leer, wenn nicht lesbar. */
export async function loadAllPoolAssignments(): Promise<{ dispatchId: string; assetId: string }[]> {
  try {
    return await db.dispatchImage.findMany({ select: { dispatchId: true, assetId: true } });
  } catch {
    return [];
  }
}

/** Wie oft ein Bild in Pools steckt; 0, wenn die Tabelle nicht lesbar ist. */
export async function countPoolUses(assetId: string): Promise<number> {
  try {
    return await db.dispatchImage.count({ where: { assetId } });
  } catch {
    return 0;
  }
}
