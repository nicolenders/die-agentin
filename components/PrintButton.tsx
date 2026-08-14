"use client";

// Kleiner Druck-Auslöser für die Lebenslauf-Seite. Wird beim Drucken selbst
// ausgeblendet (Klasse no-print).
export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn solid sm no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
