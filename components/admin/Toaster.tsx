"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/admin/toast";

// Kurze Rückmeldung oben rechts („Gespeichert.", „Hochgeladen."). Blendet sich
// nach 3 Sekunden von selbst aus. Erfolge sind flüchtig — Fehler bleiben dort
// stehen, wo sie entstanden sind (Formular), damit sie niemand verpasst.
const VISIBLE_MS = 3000;

interface ToastItem extends ToastDetail {
  id: number;
}

let nextId = 0;

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = ++nextId;
      setItems((prev) => [...prev, { id, message: detail.message, kind: detail.kind ?? "ok" }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, VISIBLE_MS);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.kind === "err" ? " err" : ""}`}>
          <span aria-hidden className="toast-mark">{t.kind === "err" ? "!" : "✓"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
