"use client";

import { useState } from "react";
import { showToast } from "@/lib/admin/toast";

// Erzeugt einen teilbaren, befristeten Vorschau-Link und legt ihn in die
// Zwischenablage. Die Aktion kommt gebunden vom Server (z. B. mit der ID der
// Depesche), damit diese Komponente nicht wissen muss, wofür der Link ist.
export default function PreviewLinkButton({
  create,
}: {
  create: () => Promise<{ url?: string; error?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await create();
      if (!res.url) {
        showToast(res.error ?? "Vorschau-Link konnte nicht erzeugt werden. Erneut versuchen.", "err");
        return;
      }
      setUrl(res.url);
      try {
        await navigator.clipboard.writeText(res.url);
        showToast("Vorschau-Link kopiert. Gültig sieben Tage.");
      } catch {
        // Ohne Zwischenablage (z. B. Berechtigung verweigert) steht der Link
        // darunter zum Markieren.
        showToast("Vorschau-Link erzeugt. Bitte unten markieren und kopieren.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button type="button" className="btn ghost sm" onClick={run} disabled={busy}>
        {busy ? "Erzeuge Link …" : "Teilbaren Vorschau-Link kopieren"}
      </button>
      {url ? (
        <input className="f" readOnly value={url} aria-label="Vorschau-Link" onFocus={(e) => e.currentTarget.select()} />
      ) : null}
    </span>
  );
}
