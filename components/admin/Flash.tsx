// Kurze Erfolgs-/Fehlermeldung nach einer Server-Action. Die Aktionen leiten
// nach getaner Arbeit mit `?ok=<code>` bzw. `?err=<code>` zurück; diese
// Komponente übersetzt den Code in verständlichen deutschen Text. So gibt es
// sichtbares Feedback statt eines still wirkungslosen Knopfs.
const MESSAGES: Record<string, string> = {
  saved: "Gespeichert.",
  social: "Social-Media-Profile gespeichert.",
  created: "Angelegt.",
  updated: "Aktualisiert.",
  deleted: "Gelöscht.",
  reordered: "Reihenfolge aktualisiert.",
  published: "Veröffentlicht.",
  "missing-fields": "Bitte alle Pflichtfelder ausfüllen — nichts wurde gespeichert.",
  "not-found": "Eintrag nicht gefunden.",
  "category-in-use": "Kategorie ist noch zugeordnet — erst umhängen oder löschen.",
  "alt-required": "Alt-Text ist Pflicht (außer das Bild ist dekorativ).",
  "asset-in-use": "Bild wird noch verwendet — erst aus Beitrag/Einsatz entfernen.",
  "audience-in-use": "Zielgruppe ist noch zugeordnet — erst umhängen oder Briefings ändern.",
  failed: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
};

export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  const code = err ?? ok;
  if (!code) return null;
  const isError = Boolean(err);
  const text = MESSAGES[code] ?? code;
  return (
    <p
      role="status"
      className={`st ${isError ? "" : "live"}`}
      style={{
        display: "inline-block",
        marginTop: 12,
        ...(isError ? { color: "var(--magenta)", borderColor: "var(--magenta)" } : {}),
      }}
    >
      {text}
    </p>
  );
}
