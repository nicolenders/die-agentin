"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Setzt bei jedem Seitenwechsel die Scroll-Position sofort nach ganz oben.
// Hintergrund: Mit global gesetztem `scroll-behavior: smooth` löst der
// automatische Scroll-Reset des App Routers eine *animierte* Bewegung aus, die
// beim Nachladen dynamischer Inhalte abbricht — dann landet man nicht oben und
// die Seitenüberschrift bleibt hinter dem klebenden Header verborgen.
// Führt eine Route dagegen einen Anker (#hash) mit, überlassen wir das Scrollen
// dem Browser; `scroll-padding-top` (globals.scss) hält den Header frei.
export default function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
