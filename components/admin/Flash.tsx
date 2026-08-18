"use client";

import { useEffect } from "react";
import { showToast } from "@/lib/admin/toast";

// Kurze Erfolgs-/Fehlermeldung nach einer Server-Action. Die Aktionen leiten
// nach getaner Arbeit mit `?ok=<code>` bzw. `?err=<code>` zurück; diese
// Komponente übersetzt den Code in verständlichen deutschen Text.
//
// Erfolg erscheint als kurze Einblendung oben rechts (verschwindet nach drei
// Sekunden), ein Fehler bleibt an Ort und Stelle stehen, bis er behoben ist.
export const FLASH_MESSAGES: Record<string, string> = {
  saved: "Gespeichert.",
  social: "Social-Media-Profile gespeichert.",
  templates: "Teilen-Vorlagen gespeichert.",
  contact: "Kontaktangaben gespeichert.",
  bios: "Bios gespeichert.",
  created: "Angelegt.",
  updated: "Aktualisiert.",
  deleted: "Gelöscht.",
  reordered: "Reihenfolge aktualisiert.",
  published: "Veröffentlicht.",
  toggled: "Sichtbarkeit geändert.",
  archived: "Ins Archiv gelegt. Bei neuen Einsätzen ab heute nicht mehr wählbar.",
  unarchived: "Aus dem Archiv geholt.",
  uploaded: "Hochgeladen.",
  merged: "Zusammengeführt. Einsätze, Sprachfassungen und Verknüpfungen sind übernommen.",
  "has-links": "Identität hat verknüpfte Einträge: erst umhängen oder zurückziehen statt löschen.",
  "cannot-publish": "Nicht veröffentlichbar: Rolle (DE) und gültige Akzentfarbe sind Pflicht.",
  "missing-role": "Rolle (DE) ist Pflicht. Nichts wurde gespeichert.",
  "missing-slug": "Slug fehlt. Nichts wurde gespeichert.",
  "bad-color": "Keine gültige Akzentfarbe (Hex, z. B. #8B5CF6).",
  "missing-fields": "Bitte alle Pflichtfelder ausfüllen. Nichts wurde gespeichert.",
  "not-found": "Eintrag nicht gefunden.",
  "category-in-use": "Kategorie ist noch zugeordnet: erst umhängen oder löschen.",
  "alt-required": "Alt-Text ist Pflicht (außer das Bild ist dekorativ).",
  "asset-in-use": "Bild wird noch verwendet: erst aus Beitrag/Einsatz entfernen.",
  "document-in-use": "Datei ist noch einem Einsatz zugeordnet: dort erst entfernen.",
  "audience-in-use": "Zielgruppe ist noch zugeordnet: erst umhängen oder Briefings ändern.",
  "merge-self": "Quelle und Ziel sind dasselbe. Nichts wurde geändert.",
  "merge-failed": "Zusammenführen fehlgeschlagen. Nichts wurde geändert.",
  failed: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
};

export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  const okText = ok ? FLASH_MESSAGES[ok] ?? ok : null;

  useEffect(() => {
    if (okText) showToast(okText);
  }, [okText]);

  if (!err) return null;
  return (
    <p
      role="alert"
      className="st"
      style={{
        display: "inline-block",
        marginTop: 12,
        color: "var(--magenta)",
        borderColor: "var(--magenta)",
      }}
    >
      {FLASH_MESSAGES[err] ?? err}
    </p>
  );
}
