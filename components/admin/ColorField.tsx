"use client";

import { useState } from "react";
import { accentContrastOnInk, isValidHex } from "@/lib/identities";

// Akzentfarben-Feld mit Live-Kontrastprüfung (Phase 2.6). Gültige Hex-Farbe ist
// blockierend (serverseitig erneut geprüft); schwacher Kontrast (<3:1 gegen den
// dunklen Seitengrund) ist eine Warnung, kein Blocker.
export default function ColorField({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial || "#8B5CF6");
  const valid = isValidHex(value);
  const ratio = accentContrastOnInk(value);
  const weak = ratio !== null && ratio < 3;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="color"
          value={valid ? value : "#8B5CF6"}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Farbwähler"
          style={{ width: 44, height: 34, padding: 0, border: "1px solid var(--line-soft)", borderRadius: 4, background: "none" }}
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Akzentfarbe (Hex)"
          style={{ width: 130, fontFamily: "var(--mono)" }}
        />
        <span
          aria-hidden
          style={{ width: 20, height: 20, borderRadius: "50%", background: valid ? value : "transparent", border: "1px solid var(--line-soft)" }}
        />
      </div>
      <p className="meta" style={{ marginTop: 6 }}>
        {!valid
          ? "⚠ Keine gültige Hex-Farbe (z. B. #8B5CF6)."
          : ratio !== null
            ? `Kontrast gegen den Seitengrund: ${ratio.toFixed(1)}:1${weak ? ", ⚠ schwach (unter 3:1)." : ", ok."}`
            : ""}
      </p>
    </div>
  );
}
