"use client";

import { useEffect, useRef, useState } from "react";

// Info-Icon oben rechts auf einer Seite. Klick öffnet ein kleines Panel mit
// erklärenden Abschnitten (reine Information, keine Eingabe). Schließt per Esc,
// Klick außerhalb oder Schließen-Knopf; Fokus kehrt zum Auslöser zurück.
export default function InfoPopover({
  title = "Info",
  sections,
}: {
  title?: string;
  sections: { heading: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ Info
      </button>
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className="card bracket"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "min(420px, 88vw)",
            zIndex: 40,
            boxShadow: "0 10px 40px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <p className="eyebrow" style={{ margin: 0 }}>{title}</p>
            <button
              type="button"
              className="btn ghost sm"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
          {sections.map((s) => (
            <div key={s.heading} style={{ marginTop: 12 }}>
              <p className="eyebrow" style={{ margin: 0 }}>{s.heading}</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>{s.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
