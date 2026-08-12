"use client";

import { useState, type ReactNode } from "react";

export interface FormTabDef {
  id: string;
  label: string;
  content: ReactNode;
}

// Registerkarten für EIN gemeinsames Formular. Anders als `Tabs` bleiben alle
// Panels im DOM (nur per `hidden` ausgeblendet), damit auch Felder in
// inaktiven Tabs mit abgeschickt werden.
export default function FormTabs({ tabs, initialId }: { tabs: FormTabDef[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id);
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
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== active} style={{ paddingTop: 18 }}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
