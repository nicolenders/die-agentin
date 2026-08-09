"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { buildExtensions } from "@/lib/editor/extensions";
import { parseRichValue } from "@/lib/content/rich";
import type { TiptapDoc } from "@/lib/content/schema";

// Formular-taugliches Rich-Text-Feld (SPEC §4). Ersetzt einfache <textarea> für
// Fließtext. Der Editor speichert TipTap-JSON in ein verstecktes Input mit dem
// gegebenen `name`, sodass Server-Actions den Wert wie gewohnt aus FormData
// lesen. Bestehende Plain-Text-Werte werden beim Laden verpackt (keine
// Datenmigration nötig). Bereinigt/serialisiert wird serverseitig
// (serializeRichValue) — hier reicht das rohe Editor-JSON.

function btn(
  editor: Editor,
  label: string,
  title: string,
  action: () => void,
  active?: boolean,
) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={action}
      style={{
        background: active ? "rgba(139,92,246,.2)" : "none",
        border: "1px solid var(--line-soft)",
        color: "var(--text)",
        borderRadius: 3,
        minWidth: 30,
        height: 28,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

export default function RichTextField({
  name,
  defaultValue,
  minimal = false,
  ariaLabel,
  onChange,
}: {
  /** Name des versteckten Inputs für Server-Action-Formulare. */
  name?: string;
  defaultValue?: string | null;
  /** Nur Betonung + Akzent (z. B. für Überschriften), keine Blöcke/Listen. */
  minimal?: boolean;
  ariaLabel?: string;
  /** Für kontrollierte Nutzung (z. B. MissionForm): erhält das JSON bei Änderung. */
  onChange?: (value: string) => void;
}) {
  const initialDoc: TiptapDoc = parseRichValue(defaultValue);
  const [json, setJson] = useState<string>(() => JSON.stringify(initialDoc));

  const editor = useEditor({
    extensions: buildExtensions("field"),
    content: initialDoc,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const next = JSON.stringify(editor.getJSON());
      setJson(next);
      onChange?.(next);
    },
    editorProps: {
      attributes: {
        class: "rich-input",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
  });

  return (
    <div className="rich-field">
      {editor ? (
        <div
          className="toolbar"
          role="toolbar"
          aria-label="Textformatierung"
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}
        >
          {btn(editor, "B", "Fett", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
          {btn(editor, "I", "Kursiv", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
          {btn(editor, "✶", "Akzent (Verlauf)", () => editor.chain().focus().toggleMark("highlight").run(), editor.isActive("highlight"))}
          {!minimal ? (
            <>
              {btn(editor, "U", "Unterstrichen", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
              {btn(editor, "S", "Durchgestrichen", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
              {btn(editor, "H2", "Überschrift 2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
              {btn(editor, "H3", "Überschrift 3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
              {btn(editor, "•", "Aufzählung", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
              {btn(editor, "1.", "Nummerierte Liste", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
              {btn(editor, "❝", "Zitat", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
              {btn(editor, "⛓", "Link", () => {
                const url = window.prompt("Link-URL");
                if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
              }, editor.isActive("link"))}
            </>
          ) : null}
        </div>
      ) : null}

      <EditorContent editor={editor} />
      {name ? <input type="hidden" name={name} value={json} readOnly /> : null}
    </div>
  );
}
