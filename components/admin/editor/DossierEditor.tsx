"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { buildExtensions } from "@/lib/editor/extensions";
import { sanitizeDocument } from "@/lib/content/sanitize";
import { emptyDoc, type TiptapDoc } from "@/lib/content/schema";
import type { AssetMap } from "@/lib/content/assets";
import RenderDocument from "@/components/content/RenderDocument";
import EditorToolbar, { type PickMode } from "./EditorToolbar";
import MediaPicker, { type MediaItem } from "./MediaPicker";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import {
  saveDossier,
  suggestDossierTranslation,
  type SaveDossierInput,
} from "@/app/(admin)/admin/(protected)/dossiers/actions";

type Loc = "de" | "en";

export interface DossierCategoryOption {
  id: string;
  name: string;
}

export interface DossierEditorInitial {
  dossierId?: string;
  categoryIds: string[];
  tocEnabled: boolean;
  publishAtLocal: string;
  de: { title: string; summary: string; doc: TiptapDoc };
  en: { title: string; summary: string; doc: TiptapDoc; confirmed: boolean } | null;
}

export default function DossierEditor({
  initial,
  categories,
}: {
  initial: DossierEditorInitial;
  categories: DossierCategoryOption[];
}) {
  const [locale, setLocale] = useState<Loc>("de");
  const [enEnabled, setEnEnabled] = useState(Boolean(initial.en));
  const [enIsDraft, setEnIsDraft] = useState(false);
  const [enConfirmed, setEnConfirmed] = useState(initial.en?.confirmed ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds);
  const [tocEnabled, setTocEnabled] = useState(initial.tocEnabled);
  const [publishAtLocal, setPublishAtLocal] = useState(initial.publishAtLocal);
  const [deTitle, setDeTitle] = useState(initial.de.title);
  const [deSummary, setDeSummary] = useState(initial.de.summary);
  const [enTitle, setEnTitle] = useState(initial.en?.title ?? "");
  const [enSummary, setEnSummary] = useState(initial.en?.summary ?? "");
  const [assets, setAssets] = useState<AssetMap>({});
  const [preview, setPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<TiptapDoc>(() =>
    sanitizeDocument(initial.de.doc, "dossier"),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [picker, setPicker] = useState<PickMode | null>(null);

  const docs = useRef<{ de: TiptapDoc; en: TiptapDoc }>({
    de: initial.de.doc,
    en: initial.en?.doc ?? emptyDoc(),
  });

  const editor = useEditor({
    extensions: buildExtensions("dossier"),
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
    if (preview) setPreviewDoc(sanitizeDocument(docs.current[target], "dossier"));
  }
  function openPreview() {
    snapshot();
    setPreviewDoc(sanitizeDocument(docs.current[locale], "dossier"));
    setPreview(true);
  }

  function handlePick(item: MediaItem) {
    const mode = picker;
    setPicker(null);
    setAssets((prev) => ({
      ...prev,
      [item.id]: { id: item.id, url: item.url, alt: item.altDe, width: item.width, height: item.height, decorative: item.decorative },
    }));
    if (!editor) return;
    if (mode === "image") editor.chain().focus().insertContent({ type: "image", attrs: { assetId: item.id, layout: "full" } }).run();
    else if (mode === "gallery") editor.chain().focus().insertContent({ type: "gallery", attrs: { assetIds: [item.id] } }).run();
    else if (mode === "margin-left" || mode === "margin-right") {
      const side = mode === "margin-left" ? "left" : "right";
      editor.chain().focus().updateAttributes("paragraph", { marginAsset: { assetId: item.id, side } }).run();
    }
  }

  async function handleTranslate() {
    snapshot();
    setTranslating(true);
    setStatus(null);
    const res = await suggestDossierTranslation({
      title: deTitle,
      summary: deSummary,
      bodyJson: JSON.stringify(docs.current.de),
    });
    setTranslating(false);
    if (!res.ok || !res.bodyJson) {
      setStatus(res.error ?? "Übersetzung fehlgeschlagen.");
      return;
    }
    setEnTitle(res.title ?? "");
    setEnSummary(res.summary ?? "");
    try {
      docs.current.en = sanitizeDocument(JSON.parse(res.bodyJson), "dossier");
    } catch {
      docs.current.en = emptyDoc();
    }
    setEnEnabled(true);
    setEnIsDraft(true);
    setEnConfirmed(false);
    switchLocale("en");
    setStatus("EN-Rohübersetzung erzeugt (KI-Entwurf). Bitte prüfen und bestätigen.");
  }

  async function handleSave(intent: SaveDossierInput["intent"]) {
    snapshot();
    setSaving(true);
    setStatus(null);
    const res = await saveDossier({
      dossierId: initial.dossierId,
      categoryIds,
      tocEnabled,
      publishAtLocal,
      intent,
      de: { title: deTitle, summary: deSummary, bodyJson: JSON.stringify(docs.current.de) },
      en: enEnabled
        ? { title: enTitle, summary: enSummary, bodyJson: JSON.stringify(docs.current.en), confirmed: enConfirmed }
        : null,
    });
    setSaving(false);
    setStatus(res.ok ? `Gespeichert (${res.status}).` : (res.error ?? "Fehler."));
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Dossier bearbeiten</h1>
        <div style={{ marginLeft: "auto", display: "flex", border: "1px solid var(--line)", borderRadius: 4, overflow: "hidden" }}>
          <button aria-pressed={!preview} onClick={() => setPreview(false)} className="btn ghost sm" style={{ border: 0 }}>Bearbeiten</button>
          <button aria-pressed={preview} onClick={openPreview} className="btn ghost sm" style={{ border: 0 }}>Als Leser ansehen</button>
        </div>
      </div>

      {preview ? (
        <div style={{ border: "1px solid var(--violet)", borderRadius: 4, padding: "28px 30px" }}>
          <h2>{locale === "de" ? deTitle : enTitle}</h2>
          <RenderDocument doc={previewDoc} assets={assets} locale={locale} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
          <div>
            <div className="lang-tabs" role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", marginBottom: 14 }}>
              <button role="tab" aria-selected={locale === "de"} onClick={() => switchLocale("de")} className="btn ghost sm" style={{ border: 0 }}>DEUTSCH</button>
              <button role="tab" aria-selected={locale === "en"} disabled={!enEnabled} onClick={() => switchLocale("en")} className="btn ghost sm" style={{ border: 0 }}>
                ENGLISH{enIsDraft ? " · KI-ENTWURF" : ""}
              </button>
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={handleTranslate} disabled={translating}>
                {translating ? "Übersetzt …" : "EN-Rohübersetzung vorschlagen"}
              </button>
            </div>

            {locale === "en" && enIsDraft ? (
              <div className="lang-fallback" role="note" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>KI-Entwurf: nicht automatisch veröffentlichbar. Erst nach Bestätigung.</span>
                <button className="btn ghost sm" onClick={() => { setEnIsDraft(false); setEnConfirmed(true); setStatus("EN bestätigt (REVIEWED)."); }}>
                  EN bestätigen
                </button>
              </div>
            ) : null}

            <EditorToolbar editor={editor} context="dossier" onPick={(m) => setPicker(m)} />

            <input
              className="f"
              placeholder="Titel"
              value={locale === "de" ? deTitle : enTitle}
              onChange={(e) => (locale === "de" ? setDeTitle : setEnTitle)(e.target.value)}
              style={{ fontFamily: "var(--display)", fontSize: 24, marginBottom: 10 }}
            />
            <textarea
              className="f"
              placeholder="Kurzbeschreibung"
              rows={2}
              value={locale === "de" ? deSummary : enSummary}
              onChange={(e) => (locale === "de" ? setDeSummary : setEnSummary)(e.target.value)}
            />
            <div style={{ marginTop: 14, border: "1px solid var(--line-soft)", borderRadius: 4, padding: 12, minHeight: 320 }}>
              <EditorContent editor={editor} />
            </div>
          </div>

          <aside>
            <p className="eyebrow">Dossier</p>
            <label className="f">Kategorien (Mehrfachauswahl)</label>
            <CategoryMultiSelect options={categories} value={categoryIds} onChange={setCategoryIds} />
            <div style={{ marginTop: 4 }} />

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, fontSize: 13 }}>
              <input type="checkbox" checked={tocEnabled} onChange={(e) => setTocEnabled(e.target.checked)} />
              Inhaltsverzeichnis anzeigen
            </label>

            <label className="f" htmlFor="do-date">Veröffentlichen am (Europe/Berlin)</label>
            <input id="do-date" className="f" type="datetime-local" value={publishAtLocal} onChange={(e) => setPublishAtLocal(e.target.value)} />

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn ghost sm" disabled={saving} onClick={() => handleSave("draft")}>Entwurf speichern</button>
              <button className="btn solid sm" disabled={saving} onClick={() => handleSave("publish")}>Veröffentlichen</button>
            </div>
            {status ? <p className="meta" style={{ marginTop: 10 }}>{status}</p> : null}
          </aside>
        </div>
      )}

      {picker ? <MediaPicker onPick={handlePick} onClose={() => setPicker(null)} /> : null}
    </section>
  );
}
