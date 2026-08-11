"use client";

import { useState } from "react";

// Kopiert Text in die Zwischenablage (Speaker-Kit, Anhang A). Der Text selbst
// ist immer sichtbar (nicht nur per Klick erreichbar) — der Knopf ist Komfort.
export default function CopyButton({ text, label = "Kopieren", doneLabel = "Kopiert ✓" }: { text: string; label?: string; doneLabel?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* Zwischenablage nicht verfügbar — Text ist trotzdem sichtbar/markierbar. */
    }
  }
  return (
    <button type="button" className="btn ghost sm" onClick={copy} aria-live="polite">
      {done ? doneLabel : label}
    </button>
  );
}
