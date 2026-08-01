"use client";

import { useState } from "react";
import { markManualDone } from "@/app/(admin)/admin/(protected)/kanaele/actions";

// Ein-Klick-Freigabe für X/Instagram/Facebook (SPEC §7.2): fertiger Text,
// „Text kopieren", „Teilen" über die Web Share API und „Erledigt".
export default function ManualShareCard({
  id,
  platform,
  text,
  url,
}: {
  id: string;
  platform: string;
  text: string;
  url: string;
}) {
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url ? `${text}\n\n${url}` : text);
      setMsg("Text kopiert.");
    } catch {
      setMsg("Kopieren nicht möglich.");
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, url: url || undefined });
      } catch {
        /* Nutzer hat abgebrochen */
      }
    } else {
      await copy();
      setMsg("Teilen wird hier nicht unterstützt — Text kopiert.");
    }
  }

  if (done) return null;

  return (
    <div className="card bracket" style={{ marginBottom: 12 }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        {platform} · Ein-Klick-Freigabe
      </p>
      <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{text}</p>
      {url ? <p className="meta">{url}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button className="btn ghost sm" onClick={copy}>Text kopieren</button>
        <button className="btn ghost sm" onClick={share}>Teilen</button>
        <button
          className="btn solid sm"
          onClick={async () => {
            await markManualDone(id);
            setDone(true);
          }}
        >
          Erledigt
        </button>
      </div>
      {msg ? <p className="meta" style={{ marginTop: 6 }}>{msg}</p> : null}
    </div>
  );
}
