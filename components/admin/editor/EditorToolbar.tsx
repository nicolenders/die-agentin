"use client";

import type { Editor } from "@tiptap/react";
import type { ContentContext } from "@/lib/content/schema";

export type PickMode = "image" | "gallery" | "margin-left" | "margin-right";

// Gemeinsame Editor-Toolbar (SPEC §4). Zeigt kontextabhängig die passenden
// Einfüge-Schaltflächen (Link-Karte nur in Beiträgen; Galerie/Video/TOC in
// Dossiers).
export default function EditorToolbar({
  editor,
  context,
  onPick,
}: {
  editor: Editor | null;
  context: ContentContext;
  onPick: (mode: PickMode) => void;
}) {
  if (!editor) return null;

  const btn = (label: string, title: string, action: () => void, active?: boolean) => (
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
        minWidth: 32,
        height: 30,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="toolbar"
      role="toolbar"
      aria-label="Textformatierung"
      style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}
    >
      {btn("B", "Fett", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
      {btn("I", "Kursiv", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
      {btn("U", "Unterstrichen", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
      {btn("S", "Durchgestrichen", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
      {btn("H2", "Überschrift 2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
      {btn("H3", "Überschrift 3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      {btn("•", "Liste", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
      {btn("1.", "Nummerierte Liste", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {btn("❝", "Zitat", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
      {btn("</>", "Code", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"))}
      {btn("—", "Trenner", () => editor.chain().focus().setHorizontalRule().run())}
      {btn("⛓", "Link", () => {
        const url = window.prompt("Link-URL");
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }, editor.isActive("link"))}
      {btn("▣", "Bild", () => onPick("image"))}
      {btn("◧", "Bild links am Absatz", () => onPick("margin-left"))}
      {btn("◨", "Bild rechts am Absatz", () => onPick("margin-right"))}
      {context === "post"
        ? btn("⛓K", "Link-Karte", () => {
            const url = window.prompt("URL der Link-Karte");
            if (url) editor.chain().focus().insertContent({ type: "linkCard", attrs: { url, title: url } }).run();
          })
        : null}
      {context === "dossier" || context === "mission"
        ? btn("▤", "Bildergalerie", () => onPick("gallery"))
        : null}
      {context === "dossier"
        ? btn("▶", "Video (YouTube)", () => {
            const videoId = window.prompt("YouTube Video-ID");
            if (videoId) editor.chain().focus().insertContent({ type: "video", attrs: { provider: "youtube", videoId } }).run();
          })
        : null}
      {context === "dossier"
        ? btn("≡", "Inhaltsverzeichnis", () => editor.chain().focus().insertContent({ type: "toc" }).run())
        : null}
    </div>
  );
}
