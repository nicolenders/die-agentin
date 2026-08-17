"use client";

import { useCallback, useSyncExternalStore } from "react";

// Fensterbreite als React-Zustand. Gebraucht dort, wo sich am Telefon nicht nur
// die Darstellung ändert, sondern der Inhalt: die Einsätze zeigen dort ohne
// Filter nur, was noch ansteht (siehe MissionExplorer). Reines CSS reicht dafür
// nicht, weil sich auch Zählungen und Meldungen ändern.
//
// `useSyncExternalStore` statt Effekt-plus-Zustand: Auf dem Server und im ersten
// Client-Durchgang ist die Antwort `false`, danach der echte Wert — damit gibt
// es keine Abweichung beim Hydrieren.

/** Ab hier gilt die Ansicht als Telefon (gleiche Grenze wie im Stylesheet). */
export const PHONE_QUERY = "(max-width: 640px)";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Kurzform für die Telefon-Ansicht. */
export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY);
}
