"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import MediaPicker, { type MediaItem } from "@/components/admin/editor/MediaPicker";
import RichTextField from "@/components/admin/editor/RichTextField";
import { MAX_DISPATCH_IMAGES, lacksEnglishAlt, type PoolImage } from "@/lib/dispatches/images";
import { toMediaSource } from "@/lib/media/source";

// Bilder-Pool einer Depesche (ADR 0033). Gepflegt wird er einmal im Register
// „Stammdaten"; die Editoren in „Deutsch" und „English" fügen daraus ein. Alle
// drei Register sind gleichzeitig im DOM (FormTabs), deshalb teilen sie den
// Pool über einen Context — ein eben hinzugefügtes Bild steht ohne Speichern
// in beiden Sprachen bereit. Gespeichert wird er mit dem Formular: als
// geordnete Liste versteckter Felder `imageIds`.

interface PoolState {
  pool: PoolImage[];
  setPool: (update: (prev: PoolImage[]) => PoolImage[]) => void;
}

const PoolContext = createContext<PoolState | null>(null);

function usePool(): PoolState {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error("DispatchImagePoolProvider fehlt um die Depeschen-Maske.");
  return ctx;
}

export function DispatchImagePoolProvider({ initial, children }: { initial: PoolImage[]; children: ReactNode }) {
  const [pool, setPoolState] = useState<PoolImage[]>(initial);
  const setPool = useCallback((update: (prev: PoolImage[]) => PoolImage[]) => setPoolState(update), []);
  return <PoolContext.Provider value={{ pool, setPool }}>{children}</PoolContext.Provider>;
}

function fromMediaItem(item: MediaItem): PoolImage {
  return {
    id: item.id,
    url: item.url,
    altDe: item.altDe,
    altEn: item.altEn?.trim() ? item.altEn : null,
    decorative: item.decorative ?? false,
    ai: toMediaSource(item.source) === "AI",
  };
}

/** Verwaltung des Pools im Register „Stammdaten". */
export function DispatchImagesField({
  usage,
  available = true,
}: {
  usage: Record<string, string[]>;
  /** false, wenn der Pool serverseitig nicht lesbar war (Migration fehlt). */
  available?: boolean;
}) {
  const { pool, setPool } = usePool();
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const full = pool.length >= MAX_DISPATCH_IMAGES;

  // Ohne lesbaren Pool kein Marker `imagesManaged`: Das Speichern lässt den Pool
  // dann unberührt, statt am fehlenden Schema zu scheitern.
  if (!available) {
    return (
      <p className="meta" role="status" style={{ marginTop: 0 }}>
        Bilder-Pool gerade nicht verfügbar: Die Datenbank-Migration für die Depeschen-Bilder ist noch
        nicht angewandt. Text und Stammdaten lassen sich normal speichern. Nach dem nächsten Neustart
        der App erneut öffnen.
      </p>
    );
  }

  function add(item: MediaItem) {
    setPool((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, fromMediaItem(item)]));
    setPicking(false);
  }
  function move(index: number, delta: -1 | 1) {
    setPool((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }
  function remove(id: string) {
    setPool((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <input type="hidden" name="imagesManaged" value="1" />
      {pool.map((img) => (
        <input key={img.id} type="hidden" name="imageIds" value={img.id} />
      ))}
      {pool.length === 0 ? (
        <p className="meta" style={{ marginTop: 0 }}>
          Bilder, die du hier hinzufügst, kannst du im deutschen und im englischen Text an beliebiger
          Stelle einsetzen (Knopf ▣ im Editor). Alt-Texte pflegst du einmal in der Mediathek.
        </p>
      ) : (
        <ul className="pool-grid">
          {pool.map((img, i) => {
            const usedIn = usage[img.id] ?? [];
            return (
              <li key={img.id} className="pool-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" />
                <span className="pool-card-text">
                  {img.decorative ? <span className="meta">dekorativ</span> : img.altDe || <span className="meta">ohne Alt-Text</span>}
                </span>
                <span className="pool-card-flags">
                  {img.ai ? <span className="st sched">KI</span> : null}
                  {lacksEnglishAlt(img) ? <span className="st draft" title="Die englische Seite zeigt den deutschen Alt-Text.">EN-Alt fehlt</span> : null}
                  {usedIn.length > 0 ? (
                    <span className="st live">im Text {usedIn.map((l) => l.toUpperCase()).join(" + ")}</span>
                  ) : null}
                </span>
                <span className="pool-card-actions">
                  <button type="button" className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Nach vorn: ${img.altDe || "Bild"}`}>
                    ↑
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === pool.length - 1} aria-label={`Nach hinten: ${img.altDe || "Bild"}`}>
                    ↓
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => remove(img.id)} aria-label={`Aus dem Pool entfernen: ${img.altDe || "Bild"}`}>
                    Entfernen
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn ghost sm" onClick={() => setPicking(true)} disabled={full}>
          Bild hinzufügen
        </button>
        <span className="meta">
          {full
            ? `Mehr als ${MAX_DISPATCH_IMAGES} Bilder passen nicht an eine Depesche.`
            : "Entfernen nimmt ein Bild nur aus dem Pool, nicht aus einem Text, in dem es schon steht."}
        </span>
      </div>
      {picking ? <MediaPicker onPick={add} onClose={closePicker} /> : null}
    </div>
  );
}

/** Text-Editor einer Sprache, der aus dem Pool einfügen kann. */
export function DispatchBodyField({
  name,
  defaultValue,
  ariaLabel,
  locale,
}: {
  name: string;
  defaultValue: string | null;
  ariaLabel: string;
  locale: "de" | "en";
}) {
  const { pool } = usePool();
  return <RichTextField name={name} defaultValue={defaultValue} ariaLabel={ariaLabel} imagePool={pool} poolLocale={locale} />;
}
