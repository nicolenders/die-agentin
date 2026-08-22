"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Modaler Dialog für Bearbeitungsmasken, die eine Tabelle nicht aufblähen
// sollen. Schließt per Esc, Klick auf den Hintergrund und Schließen-Knopf; der
// Fokus wandert beim Öffnen hinein und beim Schließen dorthin zurück, wo er
// herkam — sonst landet man nach dem Schließen wieder ganz oben auf der Seite.
export default function ModalDialog({
  title,
  onClose,
  children,
  width = 720,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    // Erstes bedienbares Element im Dialog bekommt den Fokus.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, a[href]",
    );
    focusable?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,1,13,.92)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="card bracket media-modal"
        style={{ maxWidth: width, width: "100%", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>{title}</p>
          <button type="button" className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Schließen
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
