import type { ReactNode } from "react";
import Flash from "./Flash";

// Einheitlicher Kopf für Bearbeiten-Masken: Titel links, in derselben Zeile
// rechts die Aktionen (z. B. „Speichern") und links davon die Erfolgs-/Fehler-
// meldung. Die Buttons liegen per `form`-Attribut außerhalb des Formulars und
// sprechen es über die ID an — so bleibt der Speichern-Button oben rechts,
// während die Felder darunter stehen.
export default function MaskBar({
  title,
  ok,
  err,
  children,
}: {
  title: string;
  ok?: string;
  err?: string;
  children: ReactNode;
}) {
  return (
    <div className="mask-bar">
      <h1>{title}</h1>
      <div className="mask-bar-actions">
        <Flash ok={ok} err={err} />
        <div className="mask-bar-buttons">{children}</div>
      </div>
    </div>
  );
}
