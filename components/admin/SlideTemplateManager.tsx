"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { showToast } from "@/lib/admin/toast";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  SLIDE_TEMPLATE_ACCEPT,
  slideTemplateUrl,
  type SlideTemplate,
  type SlideTemplateSet,
} from "@/lib/slide-templates";
import type { Locale } from "@/lib/i18n/config";

// Foliensvorlagen: je eine PowerPoint-Datei auf Deutsch und auf Englisch. Sie
// gelten für alle Einsätze — im Einsatzformular wird die Vorlage in der
// gewählten Vortragssprache zum Download angeboten.

const LABEL: Record<Locale, string> = { de: "Deutsch", en: "Englisch" };

export default function SlideTemplateManager({
  templates,
  onRemove,
}: {
  templates: SlideTemplateSet;
  /** Server Action: entfernt die Vorlage einer Sprache (Rollenprüfung dort). */
  onRemove: (formData: FormData) => void;
}) {
  return (
    <div className="form-2col">
      {(["de", "en"] as Locale[]).map((locale) => (
        <SlideTemplateCard
          key={locale}
          locale={locale}
          template={templates[locale]}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function SlideTemplateCard({
  locale,
  template,
  onRemove,
}: {
  locale: Locale;
  template: SlideTemplate | null;
  onRemove: (formData: FormData) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("locale", locale);
      const res = await fetch("/api/admin/missions/slide-template", { method: "POST", body });
      const raw = await res.text();
      let data: { error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        setError(`Upload fehlgeschlagen (HTTP ${res.status}). ${raw.slice(0, 140)}`.trim());
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Upload fehlgeschlagen (HTTP ${res.status}).`);
        return;
      }
      showToast(`Vorlage (${LABEL[locale]}) hinterlegt.`);
      router.refresh();
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err instanceof Error ? err.message : "Netzwerkfehler"}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card bracket">
      <p className="eyebrow">Vorlage {LABEL[locale]}</p>
      {template ? (
        <>
          <p className="meta" style={{ marginTop: 0 }}>
            Hinterlegt und im Einsatzformular verlinkt.
          </p>
          <p style={{ margin: "8px 0" }}>
            <a className="btn ghost sm" href={slideTemplateUrl(template)} download={template.fileName}>
              ⬇ {template.fileName}
            </a>
          </p>
        </>
      ) : (
        <p className="meta" style={{ marginTop: 0 }}>
          Noch keine Vorlage. Ohne sie weist das Einsatzformular für diese Sprache darauf hin.
        </p>
      )}

      <input
        ref={inputRef}
        id={`tpl-${locale}`}
        type="file"
        accept={SLIDE_TEMPLATE_ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Lädt hoch …" : template ? "Ersetzen" : "PowerPoint hochladen"}
        </button>
        {template ? (
          <form action={onRemove} style={{ display: "inline" }}>
            <input type="hidden" name="locale" value={locale} />
            <ConfirmButton
              confirmText={`Vorlage (${LABEL[locale]}) entfernen? Im Einsatzformular steht dann keine ${LABEL[locale]}-Vorlage mehr bereit.`}
            >
              Entfernen
            </ConfirmButton>
          </form>
        ) : null}
      </div>
      <p className="meta" style={{ marginTop: 8 }}>.pptx oder .potx, max. 20 MB.</p>
      {error ? <p className="media-error">{error}</p> : null}
    </div>
  );
}
