"use client";

import { useEffect, useRef, useState } from "react";

type Status = "checking" | "ready" | "down";

// Datenbank-Status im Admin. Zeigt neben „Angemeldet via Entra ID" an, ob die
// (pausierbare) Azure-SQL-Instanz erreichbar ist, und sperrt die Oberfläche mit
// einem Overlay, solange sie es nicht ist — so entstehen keine Fehler beim
// Anlegen/Bearbeiten, während die Datenbank noch aufwacht.
export default function DbStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let handle: ReturnType<typeof setTimeout>;

    const tick = async () => {
      let ok = false;
      try {
        const res = await fetch("/api/health/db", { cache: "no-store" });
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (!active.current) return;
      setStatus(ok ? "ready" : "down");
      // Schnell nachfragen, solange nicht erreichbar; ruhig, wenn bereit.
      handle = setTimeout(tick, ok ? 30000 : 4000);
    };
    tick();

    return () => {
      active.current = false;
      clearTimeout(handle);
    };
  }, []);

  const label =
    status === "ready"
      ? "Datenbank bereit"
      : status === "down"
        ? "Datenbank wird geweckt …"
        : "Datenbank verbindet …";
  const pillClass = status === "ready" ? "st live" : status === "down" ? "st draft" : "st sched";

  return (
    <>
      <span className={pillClass} aria-live="polite" title="Status der Datenbankverbindung">
        {status === "ready" ? "● " : status === "down" ? "◌ " : "◍ "}
        {label}
      </span>

      {status === "down" ? (
        <div
          role="alertdialog"
          aria-label="Datenbank nicht erreichbar"
          aria-busy="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20, // unter dem Topbar (z-index 30) → Status/Abmelden bleiben bedienbar
            background: "rgba(5, 1, 13, 0.72)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div className="card bracket" style={{ maxWidth: 420, textAlign: "center" }}>
            <p className="eyebrow" style={{ marginTop: 0 }}>Datenbank wird geweckt</p>
            <p style={{ margin: "8px 0 4px" }}>
              Die Datenbank war im Ruhezustand und fährt gerade hoch. Bearbeiten und Anlegen sind
              gesperrt, bis die Verbindung steht. Das dauert meist nur wenige Sekunden.
            </p>
            <p className="meta" style={{ margin: 0 }}>Verbindung wird automatisch geprüft …</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
