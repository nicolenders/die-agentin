"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { adminDbState, type HealthResponse } from "@/lib/admin/db-health";

type Status = "checking" | "ready" | "down";

// Datenbank-Status im Admin. Zeigt neben „Angemeldet via Entra ID" an, ob die
// (pausierbare) Azure-SQL-Instanz erreichbar ist, und sperrt die Oberfläche mit
// einem Overlay, solange sie es nicht ist — so entstehen keine Fehler beim
// Anlegen/Bearbeiten, während die Datenbank noch aufwacht.
//
// Gesperrt wird ausschließlich bei nicht erreichbarer Datenbank. Ein
// fehlgeschlagener Migrationslauf ist eine getrennte Auskunft und erscheint als
// ruhige Warnung: Die Zentrale funktionierte in dem Fall nachweislich, und eine
// Sperre über einer bedienbaren Oberfläche ist schlimmer als keine Meldung.
export default function DbStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [warnMigrations, setWarnMigrations] = useState(false);
  const [migrationDetail, setMigrationDetail] = useState("");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let handle: ReturnType<typeof setTimeout>;

    const tick = async () => {
      let httpOk = false;
      let body: HealthResponse | null = null;
      try {
        const res = await fetch("/api/health/db", { cache: "no-store" });
        httpOk = res.ok;
        body = (await res.json()) as HealthResponse;
      } catch {
        httpOk = false;
      }
      if (!active.current) return;
      // Die Unterscheidung steckt in `adminDbState` — dort ist sie geprüft.
      const state = adminDbState(httpOk, body);
      const ok = !state.blocking;
      setStatus(ok ? "ready" : "down");
      setWarnMigrations(state.warnMigrations);
      setMigrationDetail(state.migrationDetail);
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

  // `status` startet auf „checking" und wird erst durch den ersten Abruf im
  // Browser zu „down" — wenn das Overlay entsteht, gibt es `document` also
  // sicher. Ein eigener „mounted"-Zustand wäre überflüssig.
  //
  // Das Overlay MUSS aus der Kopfzeile heraus in den Body: `.topbar` trägt
  // `backdrop-filter`, und das erzeugt einen Bezugsrahmen für `position: fixed`.
  // Ein `inset: 0` bezog sich damit auf die 60 px hohe Leiste statt auf das
  // Fenster — der Kasten hing oben in der Ecke und die abdunkelnde Fläche
  // dahinter deckte nur die Leiste ab, weshalb die Seite durchschien.
  const overlay =
    status === "down" ? (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="db-wake-title"
        aria-describedby="db-wake-text"
        aria-busy="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(5, 1, 13, 0.86)",
          backdropFilter: "blur(3px)",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          className="bracket"
          style={{
            maxWidth: 440,
            textAlign: "center",
            // Deckend, nicht durchscheinend: Über einer vollen Seite ist ein zu
            // 85 % deckender Kasten schwer zu lesen — Text auf Text.
            background: "var(--ink-2)",
            border: "1px solid var(--violet)",
            borderRadius: "var(--r)",
            padding: 26,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
          }}
        >
          <p className="eyebrow" id="db-wake-title" style={{ marginTop: 0, justifyContent: "center" }}>
            Datenbank wird geweckt
          </p>
          <p id="db-wake-text" style={{ margin: "8px 0 4px" }}>
            Die Datenbank war im Ruhezustand und fährt gerade hoch. Bearbeiten und Anlegen sind
            gesperrt, bis die Verbindung steht. Das dauert meist nur wenige Sekunden.
          </p>
          <p className="meta" style={{ margin: 0 }}>Verbindung wird automatisch geprüft …</p>
        </div>
      </div>
    ) : null;

  return (
    <>
      <span className={pillClass} aria-live="polite" title="Status der Datenbankverbindung">
        {status === "ready" ? "● " : status === "down" ? "◌ " : "◍ "}
        {label}
      </span>

      {/* Getrennte Auskunft, getrennte Anzeige: sichtbar, aber ohne Sperre.
          Die Warnung nennt ihren Grund — sonst sieht man sie und weiß nicht,
          wo man anfangen soll. */}
      {warnMigrations ? (
        <Link
          className="st draft topbar-optional"
          href="/admin/einstellungen?tab=system"
          title={
            migrationDetail ||
            "Die Datenbank antwortet, aber der Stand der Migrationen weicht vom Code ab. Serverprotokoll prüfen."
          }
        >
          ▲ Migration prüfen
        </Link>
      ) : null}

      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
