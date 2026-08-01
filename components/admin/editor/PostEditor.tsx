"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { buildExtensions } from "@/lib/editor/extensions";
import { sanitizeDocument } from "@/lib/content/sanitize";
import type { TiptapDoc } from "@/lib/content/schema";
import type { AssetMap } from "@/lib/content/assets";
import { buildChecklist } from "@/lib/content/checklist";
import { POST_TYPES, type PostType } from "@/lib/domain";
import RenderDocument from "@/components/content/RenderDocument";
import MediaPicker, { type MediaItem } from "./MediaPicker";
import { savePost, type SavePostInput } from "@/app/(admin)/admin/(protected)/editor/actions";

type Loc = "de" | "en";
type PickMode = "image" | "gallery" | "margin-left" | "margin-right";

const TYPE_LABEL: Record<PostType, string> = {
  SIGNAL: "Signal (geteilter Link)",
  NOTE: "Kurzmeldung",
  BACKSTAGE: "Backstage",
};

const DEVICE_WIDTH = { desktop: "100%", tablet: "768px", smartphone: "380px" } as const;

export interface PostEditorInitial {
  postId?: string;
  type: PostType;
  publishAtLocal: string;
  tags: string;
  de: { title: string; summary: string; social: string; doc: TiptapDoc };
  en: { title: string; summary: string; doc: TiptapDoc } | null;
}

function Toolbar({ editor, onInsert }: { editor: Editor | null; onInsert: (mode: PickMode) => void }) {
  if (!editor) return null;
  const btn = (label: string, title: string, action: () => void, active?: boolean) => (
    <button
      type="button"
      title={title}
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
    <div className="toolbar" role="toolbar" aria-label="Textformatierung" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
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
      {btn("▣", "Bild", () => onInsert("image"))}
      {btn("◧", "Bild links am Absatz", () => onInsert("margin-left"))}
      {btn("◨", "Bild rechts am Absatz", () => onInsert("margin-right"))}
      {btn("⛓K", "Link-Karte", () => {
        const url = window.prompt("URL der Link-Karte");
        if (url) editor.chain().focus().insertContent({ type: "linkCard", attrs: { url, title: url } }).run();
      })}
    </div>
  );
}

export default function PostEditor({ initial }: { initial: PostEditorInitial }) {
  const [locale, setLocale] = useState<Loc>("de");
  const [enEnabled, setEnEnabled] = useState<boolean>(Boolean(initial.en));
  const [type, setType] = useState<PostType>(initial.type);
  const [publishAtLocal, setPublishAtLocal] = useState(initial.publishAtLocal);
  const [tags, setTags] = useState(initial.tags);
  const [deTitle, setDeTitle] = useState(initial.de.title);
  const [deSummary, setDeSummary] = useState(initial.de.summary);
  const [deSocial, setDeSocial] = useState(initial.de.social);
  const [enTitle, setEnTitle] = useState(initial.en?.title ?? "");
  const [enSummary, setEnSummary] = useState(initial.en?.summary ?? "");
  const [assets, setAssets] = useState<AssetMap>({});
  const [preview, setPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<TiptapDoc>(() =>
    sanitizeDocument(initial.de.doc, "post"),
  );
  const [device, setDevice] = useState<keyof typeof DEVICE_WIDTH>("desktop");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickMode | null>(null);

  const docs = useRef<{ de: TiptapDoc; en: TiptapDoc }>({
    de: initial.de.doc,
    en: initial.en?.doc ?? { type: "doc", content: [] },
  });

  const editor = useEditor({
    extensions: buildExtensions("post"),
    content: initial.de.doc,
    immediatelyRender: false,
  });

  function snapshot() {
    if (editor) docs.current[locale] = editor.getJSON() as TiptapDoc;
  }

  function switchLocale(target: Loc) {
    if (target === locale) return;
    snapshot();
    editor?.commands.setContent(docs.current[target]);
    setLocale(target);
    if (preview) setPreviewDoc(sanitizeDocument(docs.current[target], "post"));
  }

  function openPreview() {
    snapshot();
    setPreviewDoc(sanitizeDocument(docs.current[locale], "post"));
    setPreview(true);
  }

  function handlePick(item: MediaItem) {
    const mode = picker;
    setPicker(null);
    setAssets((prev) => ({
      ...prev,
      [item.id]: {
        id: item.id,
        url: item.url,
        alt: item.altDe,
        width: item.width,
        height: item.height,
        decorative: item.decorative,
      },
    }));
    if (!editor) return;
    if (mode === "image") {
      editor.chain().focus().insertContent({ type: "image", attrs: { assetId: item.id, layout: "full" } }).run();
    } else if (mode === "margin-left" || mode === "margin-right") {
      const side = mode === "margin-left" ? "left" : "right";
      editor.chain().focus().updateAttributes("paragraph", { marginAsset: { assetId: item.id, side } }).run();
    } else if (mode === "gallery") {
      editor.chain().focus().insertContent({ type: "gallery", attrs: { assetIds: [item.id] } }).run();
    }
  }

  async function handleSave(intent: SavePostInput["intent"]) {
    snapshot();
    setSaving(true);
    setStatus(null);
    const input: SavePostInput = {
      postId: initial.postId,
      type,
      publishAtLocal,
      tags,
      intent,
      de: {
        title: deTitle,
        summary: deSummary,
        bodyJson: JSON.stringify(docs.current.de),
        socialText: deSocial,
      },
      en: enEnabled
        ? {
            title: enTitle,
            summary: enSummary,
            bodyJson: JSON.stringify(docs.current.en),
          }
        : null,
    };
    const result = await savePost(input);
    setSaving(false);
    setStatus(result.ok ? `Gespeichert (${result.status}).` : (result.error ?? "Fehler."));
  }

  // Prüfliste (leichte Client-Variante; der Server prüft verbindlich, inkl.
  // Alt-Texte und tatsächlichem DE-Body).
  const checklist = buildChecklist({
    deTitle,
    deSummary,
    hasGermanBody: true,
    imagesWithoutAlt: 0,
    enPresent: enEnabled && enTitle.trim().length > 0,
  });

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Beitrag bearbeiten</h1>
        <span className="st draft">Entwurf</span>
        <div className="viewtoggle" role="group" aria-label="Ansicht wechseln" style={{ marginLeft: "auto", display: "flex", border: "1px solid var(--line)", borderRadius: 4, overflow: "hidden" }}>
          <button aria-pressed={!preview} onClick={() => setPreview(false)} className="btn ghost sm" style={{ border: 0 }}>
            Bearbeiten
          </button>
          <button
            aria-pressed={preview}
            onClick={openPreview}
            className="btn ghost sm"
            style={{ border: 0 }}
          >
            Als Leser ansehen
          </button>
        </div>
      </div>

      {preview ? (
        <div>
          <div className="preview-bar" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
            <span className="meta">◉ LESERVORSCHAU — nicht veröffentlicht</span>
            <span className="device" style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {(["desktop", "tablet", "smartphone"] as const).map((d) => (
                <button key={d} className="btn ghost sm" aria-pressed={device === d} onClick={() => setDevice(d)}>
                  {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Smartphone"}
                </button>
              ))}
            </span>
            <span className="lang" style={{ marginLeft: 8 }}>
              <button className="lang-btn" aria-current={locale === "de" ? "true" : undefined} onClick={() => switchLocale("de")}>
                DE
              </button>
              <button className="lang-btn" aria-current={locale === "en" ? "true" : undefined} onClick={() => switchLocale("en")}>
                EN
              </button>
            </span>
          </div>
          <div style={{ maxWidth: DEVICE_WIDTH[device], margin: "0 auto", border: "1px solid var(--violet)", borderRadius: 4, padding: "28px 30px" }}>
            <h2>{locale === "de" ? deTitle : enTitle}</h2>
            <RenderDocument doc={previewDoc} assets={assets} locale={locale} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
          <div>
            <div className="lang-tabs" role="tablist" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line-soft)", marginBottom: 14 }}>
              <button role="tab" aria-selected={locale === "de"} onClick={() => switchLocale("de")} className="btn ghost sm" style={{ border: 0 }}>
                DEUTSCH
              </button>
              <button role="tab" aria-selected={locale === "en"} disabled={!enEnabled} onClick={() => switchLocale("en")} className="btn ghost sm" style={{ border: 0 }}>
                ENGLISH
              </button>
              {!enEnabled ? (
                <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setEnEnabled(true)}>
                  EN hinzufügen
                </button>
              ) : null}
            </div>

            <Toolbar editor={editor} onInsert={(m) => setPicker(m)} />

            <input
              className="f"
              placeholder="Titel"
              value={locale === "de" ? deTitle : enTitle}
              onChange={(e) => (locale === "de" ? setDeTitle : setEnTitle)(e.target.value)}
              style={{ fontFamily: "var(--display)", fontSize: 24, marginBottom: 10 }}
            />
            <textarea
              className="f"
              placeholder="Kurzbeschreibung (Summary)"
              rows={2}
              value={locale === "de" ? deSummary : enSummary}
              onChange={(e) => (locale === "de" ? setDeSummary : setEnSummary)(e.target.value)}
            />

            <div style={{ marginTop: 14, border: "1px solid var(--line-soft)", borderRadius: 4, padding: 12, minHeight: 320 }}>
              <EditorContent editor={editor} />
            </div>
          </div>

          <aside>
            <p className="eyebrow">Veröffentlichung</p>
            <label className="f" htmlFor="pe-type">Beitragstyp</label>
            <select id="pe-type" className="f" value={type} onChange={(e) => setType(e.target.value as PostType)}>
              {POST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>

            <label className="f" htmlFor="pe-date">Veröffentlichen am (Europe/Berlin)</label>
            <input id="pe-date" className="f" type="datetime-local" value={publishAtLocal} onChange={(e) => setPublishAtLocal(e.target.value)} />

            <label className="f" htmlFor="pe-tags">Themen (kommagetrennt)</label>
            <input id="pe-tags" className="f" value={tags} onChange={(e) => setTags(e.target.value)} />

            <label className="f" htmlFor="pe-social">Begleittext für Social</label>
            <textarea id="pe-social" className="f" rows={3} value={deSocial} onChange={(e) => setDeSocial(e.target.value)} />

            <p className="eyebrow" style={{ marginTop: 20 }}>Prüfung</p>
            {checklist.items.map((i) => (
              <p key={i.key} style={{ fontSize: 12.5, margin: "0 0 6px", color: i.level === "ok" ? "var(--ok)" : i.level === "warn" ? "var(--warn)" : "var(--danger)" }}>
                {i.level === "ok" ? "✓" : i.level === "warn" ? "!" : "✗"} {i.label}
              </p>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn ghost sm" disabled={saving} onClick={() => handleSave("draft")}>
                Entwurf speichern
              </button>
              <button className="btn ghost sm" disabled={saving || !publishAtLocal} onClick={() => handleSave("schedule")}>
                Einplanen
              </button>
              <button className="btn solid sm" disabled={saving || !checklist.canPublish} onClick={() => handleSave("publish")}>
                Veröffentlichen
              </button>
            </div>
            {status ? <p className="meta" style={{ marginTop: 10 }}>{status}</p> : null}
          </aside>
        </div>
      )}

      {picker ? <MediaPicker onPick={handlePick} onClose={() => setPicker(null)} /> : null}
    </section>
  );
}
