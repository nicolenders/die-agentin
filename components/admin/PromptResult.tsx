"use client";

import { useRef, useState } from "react";

// Das Ergebnis der Werkbank: der fertige Prompt, sichtbar und veränderbar.
// Veränderbar mit Absicht — vor dem Kopieren fällt einem oft noch etwas ein,
// und dann soll man den Satz hier ändern können statt erst im Bildgenerator.
// Der Knopf kopiert deshalb, was im Feld STEHT, nicht, was ursprünglich
// erzeugt wurde. Geändertes wird nicht gespeichert; die Vorlage bleibt, wie
// sie ist.
export default function PromptResult({ text, rows }: { text: string; rows?: number }) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [done, setDone] = useState(false);
  const [length, setLength] = useState(text.length);

  async function copy() {
    const value = field.current?.value ?? text;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // Zwischenablage nicht verfügbar (etwa ohne HTTPS) — der Text steht
      // sichtbar im Feld und lässt sich von Hand markieren.
      field.current?.select();
    }
  }

  return (
    <div>
      <textarea
        ref={field}
        className="f prompt-out"
        aria-label="Erzeugter Prompt"
        rows={rows ?? Math.min(28, Math.max(8, Math.ceil(text.length / 90) + 2))}
        defaultValue={text}
        onChange={(event) => setLength(event.target.value.length)}
        spellCheck={false}
      />
      <div className="prompt-out-bar">
        <button className="btn solid sm" type="button" onClick={copy} aria-live="polite">
          {done ? "Kopiert ✓" : "Prompt kopieren"}
        </button>
        <span className="meta">{length} Zeichen</span>
      </div>
    </div>
  );
}
