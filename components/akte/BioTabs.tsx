"use client";

import { useId, useRef, useState } from "react";
import CopyButton from "@/components/CopyButton";

export interface BioTab {
  key: string;
  label: string;
  text: string;
}

// Die drei Bio-Längen der Akte als Register statt untereinander. Veranstalter
// suchen genau eine Länge und kopieren sie; drei aufgeklappte Textblöcke haben
// die Seite nur lang gemacht.
//
// Bedienung mit der Tastatur: Pfeiltasten wechseln das Register, Pos1/Ende
// springen an den Rand (WAI-ARIA Tabs-Pattern). Nur das aktive Register liegt
// im Tab-Verlauf, damit die Tabulatortaste direkt zum Text führt.
export default function BioTabs({
  tabs,
  copyLabel,
  copiedLabel,
}: {
  tabs: BioTab[];
  copyLabel: string;
  copiedLabel: string;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const current = tabs[Math.min(active, tabs.length - 1)];
  if (!current) return null;

  function select(index: number) {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") select(index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") select(index - 1);
    else if (event.key === "Home") select(0);
    else if (event.key === "End") select(tabs.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div>
      <div className="tab-bar" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.key}`}
            aria-selected={index === active}
            aria-controls={`${baseId}-panel-${tab.key}`}
            tabIndex={index === active ? 0 : -1}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            className={`tab${index === active ? " active" : ""}`}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="card bracket"
        role="tabpanel"
        id={`${baseId}-panel-${current.key}`}
        aria-labelledby={`${baseId}-tab-${current.key}`}
        tabIndex={0}
        style={{ padding: 20, marginTop: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>{current.label}</p>
          <span style={{ marginLeft: "auto" }}>
            <CopyButton text={current.text} label={copyLabel} doneLabel={copiedLabel} />
          </span>
        </div>
        {current.text.split("\n\n").map((paragraph, index) => (
          <p key={index} style={{ fontSize: 15 }}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
