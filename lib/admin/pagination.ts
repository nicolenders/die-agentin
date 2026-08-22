// Seitenweises Blättern in den Admin-Listen. Rein und geprüft, weil sich hier
// die klassischen Fehler verstecken: eine Seite 0, eine Seite hinter dem Ende,
// und ein „Seite 1 von 0" bei leerer Liste.

export const DEFAULT_PAGE_SIZE = 50;

export interface PageInfo {
  /** 1-basiert, immer innerhalb der vorhandenen Seiten. */
  page: number;
  pageCount: number;
  pageSize: number;
  /** Für `skip` in der Abfrage. */
  offset: number;
  /** Nummer des ersten bzw. letzten Eintrags dieser Seite, 1-basiert. */
  from: number;
  to: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/** Liest `?seite=` — alles Unbrauchbare wird zur ersten Seite. */
export function parsePage(raw: string | undefined | null): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Rechnet die Seiteninfo aus. Eine leere Liste hat EINE Seite, keine null —
 * sonst steht in der Oberfläche „Seite 1 von 0".
 */
export function paginate(
  total: number,
  requestedPage: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PageInfo {
  const size = Math.max(1, Math.trunc(pageSize));
  const count = Math.max(1, Math.ceil(Math.max(0, total) / size));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage)), count);
  const offset = (page - 1) * size;
  return {
    page,
    pageCount: count,
    pageSize: size,
    offset,
    from: total === 0 ? 0 : offset + 1,
    to: Math.min(total, offset + size),
    total,
    hasPrev: page > 1,
    hasNext: page < count,
  };
}

/**
 * Die Seitenzahlen für die Blätterleiste: immer die erste und letzte, dazu ein
 * Fenster um die aktuelle. `null` steht für eine Auslassung („…"), damit aus
 * 40 Seiten keine 40 Knöpfe werden.
 */
export function pageWindow(page: number, pageCount: number, radius = 2): (number | null)[] {
  if (pageCount <= 1) return [1];
  const wanted = new Set<number>([1, pageCount]);
  for (let p = page - radius; p <= page + radius; p++) {
    if (p >= 1 && p <= pageCount) wanted.add(p);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push(null);
    out.push(p);
    previous = p;
  }
  return out;
}
