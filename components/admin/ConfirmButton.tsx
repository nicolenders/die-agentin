"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Submit-Button mit Sicherheitsrückfrage (für Löschaktionen). Liegt in einem
// `<form action={serverAction}>`: bei Bestätigung wird das Formular normal
// abgeschickt, bei Abbruch verhindert. Ohne JavaScript wird direkt gelöscht —
// die serverseitige Rollenprüfung greift in jedem Fall.
export default function ConfirmButton({
  children,
  confirmText = "Wirklich löschen? Das lässt sich nicht rückgängig machen.",
  className = "btn ghost sm",
  ...rest
}: {
  children: ReactNode;
  confirmText?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
