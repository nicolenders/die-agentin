"use client";

import { useState } from "react";
import ModalDialog from "@/components/admin/ModalDialog";
import { lacksEnglishAlt, type PoolImage } from "@/lib/dispatches/images";

// Auswahl eines Bilds aus dem Pool der Depesche, um es in den Text einer
// Sprache einzufügen (ADR 0033). Nur die Bildunterschrift ist je Sprache —
// Bild und Alt-Texte sind am Pool gepflegt und gelten für beide.
export default function PoolImagePicker({
  pool,
  locale,
  onInsert,
  onClose,
}: {
  pool: PoolImage[];
  locale: "de" | "en";
  onInsert: (image: PoolImage, caption: string) => void;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState("");
  const lang = locale.toUpperCase();

  return (
    <ModalDialog title={`Bild in den Text (${lang}) einfügen`} onClose={onClose}>
      {pool.length === 0 ? (
        <p className="meta" style={{ marginTop: 0 }}>
          An dieser Depesche hängen noch keine Bilder. Im Register „Stammdaten“ unter „Bilder“ das
          erste hinzufügen — es steht danach hier und im anderen Sprach-Register bereit.
        </p>
      ) : (
        <>
          <label className="f" htmlFor="pool-caption">
            Bildunterschrift ({lang}) · optional
          </label>
          <input
            className="f"
            id="pool-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Erscheint unter dem Bild, nur in dieser Sprache"
          />
          <ul className="pool-grid" style={{ marginTop: 14 }}>
            {pool.map((img) => {
              const alt = locale === "en" ? img.altEn ?? img.altDe : img.altDe;
              return (
                <li key={img.id} className="pool-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" />
                  <span className="pool-card-text">
                    {img.decorative ? <span className="meta">dekorativ</span> : alt || <span className="meta">ohne Alt-Text</span>}
                    {locale === "en" && lacksEnglishAlt(img) ? (
                      <span className="meta"> · kein EN-Alt-Text, es gilt der deutsche</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="btn solid sm"
                    onClick={() => onInsert(img, caption.trim())}
                    aria-label={`Einfügen: ${img.altDe || "Bild"}`}
                  >
                    Einfügen
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ModalDialog>
  );
}
