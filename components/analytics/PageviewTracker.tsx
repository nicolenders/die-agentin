"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Meldet bei jedem Seitenwechsel einen Seitenaufruf an /api/track — first-party,
// cookielos. „Do Not Track" wird respektiert. Rendert nichts.
export default function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const dnt = navigator.doNotTrack === "1" || navigator.doNotTrack === "yes";
    if (dnt) return;
    try {
      const body = new Blob([JSON.stringify({ path: pathname })], { type: "application/json" });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/track", body);
      } else {
        void fetch("/api/track", { method: "POST", body, keepalive: true });
      }
    } catch {
      // Erfassung ist unkritisch.
    }
  }, [pathname]);

  return null;
}
