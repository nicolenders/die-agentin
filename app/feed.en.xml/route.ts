import { feedResponse } from "@/lib/feed-route";

export const dynamic = "force-dynamic";

// Englischer RSS-Feed (SPEC §5): Depeschen, Einsätze und Briefings in einem
// Strom. `?art=depeschen|einsaetze|briefings` grenzt ein.
export async function GET(request: Request) {
  return feedResponse("en", request);
}
