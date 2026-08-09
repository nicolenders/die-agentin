"use client";

import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  badge?: number; // optionale Anzahl neben dem Label
  content: ReactNode;
}

// Einfache Registerkarten (Tabs). Server-gerenderte Inhalte werden als
// `content` übergeben und nur ein Panel gleichzeitig gezeigt.
export default function Tabs({ tabs, initialId }: { tabs: TabDef[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={`tab${t.id === active ? " active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
            {typeof t.badge === "number" ? <span className="tab-count">{t.badge}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
