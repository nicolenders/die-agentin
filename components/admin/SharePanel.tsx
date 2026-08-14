"use client";

import { useEffect, useRef, useState } from "react";

export interface SharePanelProfile {
  key: string;
  label: string;
  icon: string;
  url: string;
}

// Teilen-Popup für einen Eintrag: Sprache wählen (DE/EN), fertigen Text kopieren
// und ein Social-Profil in einem neuen Tab öffnen (dort einfügen). Der Text ist
// bereits serverseitig aus der Vorlage gefüllt (Titel, Link, Identitäten …).
export default function SharePanel({
  title,
  textDe,
  textEn,
  profiles,
}: {
  title: string;
  textDe: string;
  textEn: string;
  profiles: SharePanelProfile[];
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"de" | "en">("de");
  const [msg, setMsg] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const text = lang === "de" ? textDe : textEn;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(lang === "de" ? "Text kopiert." : "Text copied.");
    } catch {
      setMsg(lang === "de" ? "Kopieren nicht möglich — Text manuell markieren." : "Copy failed — select the text manually.");
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn ghost sm"
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
      >
        Teilen
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Teilen: ${title}`}
          onClick={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 2, 10, 0.7)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            className="card bracket"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, width: "94vw", textAlign: "left" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Teilen</p>
              <button
                ref={closeRef}
                type="button"
                className="btn ghost sm"
                style={{ marginLeft: "auto" }}
                aria-label="Schließen"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                ✕
              </button>
            </div>
            <p className="meta" style={{ marginTop: 4 }}>{title}</p>

            <div className="chip-select" role="group" aria-label="Sprache" style={{ marginTop: 8 }}>
              <button type="button" className={`chip-toggle${lang === "de" ? " on" : ""}`} aria-pressed={lang === "de"} onClick={() => setLang("de")}>
                Deutsch
              </button>
              <button type="button" className={`chip-toggle${lang === "en" ? " on" : ""}`} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                English
              </button>
            </div>

            <textarea
              className="f"
              readOnly
              value={text}
              rows={6}
              style={{ marginTop: 10, width: "100%" }}
              aria-label={lang === "de" ? "Beitragstext (Deutsch)" : "Post text (English)"}
              onFocus={(e) => e.currentTarget.select()}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" className="btn solid sm" onClick={copy}>
                {lang === "de" ? "Text kopieren" : "Copy text"}
              </button>
            </div>

            <p className="meta" style={{ marginTop: 14, marginBottom: 6 }}>
              {profiles.length > 0
                ? lang === "de"
                  ? "Profil öffnen und Text einfügen:"
                  : "Open a profile and paste:"
                : lang === "de"
                  ? "Noch keine teilbaren Profile gepflegt — unter „Kanäle“ ergänzen."
                  : "No shareable profiles yet — add them under “Kanäle”."}
            </p>
            {profiles.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profiles.map((p) => (
                  <a key={p.key} className="btn ghost sm" href={p.url} target="_blank" rel="noopener noreferrer">
                    <span aria-hidden style={{ fontFamily: "var(--mono)", marginRight: 6 }}>{p.icon}</span>
                    {p.label} ↗
                  </a>
                ))}
              </div>
            ) : null}

            {msg ? <p className="meta" style={{ marginTop: 10 }}>{msg}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
