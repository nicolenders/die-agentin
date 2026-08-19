import React from "react";
import type { TiptapDoc, TiptapNode, TiptapMark } from "@/lib/content/schema";
import type { AssetMap } from "@/lib/content/assets";
import { slugify } from "@/lib/slug";
import Gallery, { type GalleryImage } from "./Gallery";
import VideoConsent from "./VideoConsent";
import AssetImage from "@/components/media/AssetImage";
import { aiImageLabels } from "@/lib/media/ai-labels";
import { embedLabels } from "@/lib/content/embed-labels";

// Renderer (SPEC §4). Bildet TipTap-Node-Typen auf React-Komponenten ab. KEIN
// dangerouslySetInnerHTML. Reine Funktion — dieselbe Ausgabe in der
// Editor-Vorschau wie auf der öffentlichen Seite. Unbekannte Node-Typen wurden
// bereits beim Speichern verworfen (sanitize.ts); zur Sicherheit werden sie hier
// erneut ignoriert.

interface RenderContext {
  assets: AssetMap;
  locale: string;
}

function textOf(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

function applyMarks(node: React.ReactNode, marks: TiptapMark[] | undefined, key: number) {
  if (!marks || marks.length === 0) return node;
  let el = node;
  // Reihenfolge: innere Betonung zuerst, Link außen.
  const has = (t: string) => marks.some((m) => m.type === t);
  if (has("highlight")) el = <span key={`h${key}`} className="accent">{el}</span>;
  if (has("code")) el = <code key={`c${key}`}>{el}</code>;
  if (has("strike")) el = <s key={`s${key}`}>{el}</s>;
  if (has("underline")) el = <u key={`u${key}`}>{el}</u>;
  if (has("italic")) el = <em key={`i${key}`}>{el}</em>;
  if (has("bold")) el = <strong key={`b${key}`}>{el}</strong>;
  const link = marks.find((m) => m.type === "link");
  if (link) {
    const href = String(link.attrs?.href ?? "#");
    const rel = typeof link.attrs?.rel === "string" ? link.attrs.rel : "noopener";
    const target = link.attrs?.target === "_blank" ? "_blank" : undefined;
    el = (
      <a key={`a${key}`} href={href} rel={rel} target={target}>
        {el}
      </a>
    );
  }
  return el;
}

function renderInline(nodes: TiptapNode[] | undefined): React.ReactNode {
  if (!nodes) return null;
  return nodes.map((n, i) => {
    if (n.type === "hardBreak") return <br key={i} />;
    if (n.type === "text") return <React.Fragment key={i}>{applyMarks(n.text ?? "", n.marks, i)}</React.Fragment>;
    // Verschachtelte Inline-Container (selten) durchreichen.
    return <React.Fragment key={i}>{renderInline(n.content)}</React.Fragment>;
  });
}

function Figure({
  assetId,
  caption,
  ctx,
  fallbackLabel,
}: {
  assetId?: string;
  caption?: string;
  ctx: RenderContext;
  fallbackLabel: string;
}) {
  const asset = assetId ? ctx.assets[assetId] : undefined;
  return (
    <figure>
      {asset ? (
        <AssetImage
          src={asset.url}
          alt={asset.decorative ? "" : asset.alt}
          ai={asset.ai}
          aiLabel={aiImageLabels(ctx.locale).aiGenerated}
          aiTitle={aiImageLabels(ctx.locale).aiGeneratedImage}
          imgStyle={{ width: "100%", borderRadius: 6 }}
        />
      ) : (
        <div className="ph">{fallbackLabel}</div>
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function collectHeadings(doc: TiptapDoc): Array<{ id: string; text: string; level: number }> {
  return doc.content
    .filter((n) => n.type === "heading")
    .map((n) => {
      const text = textOf(n);
      return { id: slugify(text), text, level: n.attrs?.level === 3 ? 3 : 2 };
    });
}

function renderNode(
  node: TiptapNode,
  key: number,
  ctx: RenderContext,
  doc: TiptapDoc,
): React.ReactNode {
  switch (node.type) {
    case "paragraph": {
      const margin = node.attrs?.marginAsset as
        | { assetId?: string; side?: string; caption?: string }
        | undefined;
      if (margin?.assetId && (margin.side === "left" || margin.side === "right")) {
        return (
          <div key={key} className={`block ${margin.side === "left" ? "left" : ""}`}>
            <div className="txt">
              <p>{renderInline(node.content)}</p>
            </div>
            <Figure
              assetId={margin.assetId}
              caption={margin.caption}
              ctx={ctx}
              fallbackLabel={`Marginalbild ${margin.side === "left" ? "links" : "rechts"}`}
            />
          </div>
        );
      }
      return <p key={key}>{renderInline(node.content)}</p>;
    }
    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const id = slugify(textOf(node));
      const Tag = (`h${level}` as unknown) as keyof React.JSX.IntrinsicElements;
      return (
        <Tag key={key} id={id}>
          {renderInline(node.content)}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="styled">
          {node.content?.map((li, i) => renderNode(li, i, ctx, doc))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="styled">
          {node.content?.map((li, i) => renderNode(li, i, ctx, doc))}
        </ol>
      );
    case "listItem": {
      const only = node.content?.length === 1 ? node.content[0] : undefined;
      if (only && only.type === "paragraph") {
        return <li key={key}>{renderInline(only.content)}</li>;
      }
      return <li key={key}>{node.content?.map((c, i) => renderNode(c, i, ctx, doc))}</li>;
    }
    case "blockquote":
      return (
        <blockquote key={key} className="quote">
          {node.content?.map((c, i) => (
            <React.Fragment key={i}>{renderInline(c.content)}</React.Fragment>
          ))}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{textOf(node)}</code>
        </pre>
      );
    case "table":
      return (
        <table key={key}>
          <tbody>
            {node.content?.map((row, i) => (
              <tr key={i}>
                {row.content?.map((cell, j) => {
                  const CellTag = cell.type === "tableHeader" ? "th" : "td";
                  return <CellTag key={j}>{renderInline(cell.content?.[0]?.content)}</CellTag>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "image":
      return (
        <Figure
          key={key}
          assetId={typeof node.attrs?.assetId === "string" ? node.attrs.assetId : undefined}
          caption={typeof node.attrs?.caption === "string" ? node.attrs.caption : undefined}
          ctx={ctx}
          fallbackLabel="Bild"
        />
      );
    case "gallery": {
      const ids = Array.isArray(node.attrs?.assetIds) ? (node.attrs.assetIds as string[]) : [];
      const images: GalleryImage[] = ids.map((id, i) => {
        const asset = ctx.assets[id];
        return asset
          ? { url: asset.url, alt: asset.decorative ? "" : asset.alt, ai: asset.ai }
          : { alt: `Bild ${i + 1}`, label: `Bild ${i + 1}` };
      });
      return (
        <Gallery
          key={key}
          images={images}
          label={embedLabels(ctx.locale).imageGallery}
          aiLabel={aiImageLabels(ctx.locale).aiGenerated}
          aiTitle={aiImageLabels(ctx.locale).aiGeneratedImage}
          caption={typeof node.attrs?.caption === "string" ? node.attrs.caption : undefined}
        />
      );
    }
    case "video":
      return (
        <VideoConsent
          key={key}
          videoId={String(node.attrs?.videoId ?? "")}
          title={typeof node.attrs?.title === "string" ? node.attrs.title : undefined}
          labels={embedLabels(ctx.locale)}
        />
      );
    case "videoGallery": {
      const videos = Array.isArray(node.attrs?.videos)
        ? (node.attrs.videos as Array<{ videoId?: string; title?: string }>)
        : [];
      return (
        <div key={key} style={{ display: "grid", gap: 14 }}>
          {videos.map((v, i) => (
            <VideoConsent
              key={i}
              videoId={String(v.videoId ?? "")}
              title={v.title}
              labels={embedLabels(ctx.locale)}
            />
          ))}
        </div>
      );
    }
    case "linkCard": {
      const url = String(node.attrs?.url ?? "#");
      const title = typeof node.attrs?.title === "string" ? node.attrs.title : url;
      const site = typeof node.attrs?.site === "string" ? node.attrs.site : "";
      return (
        <a key={key} className="quoted-link" href={url} target="_blank" rel="noopener noreferrer">
          <b>{title}</b>
          {site ? <span className="meta">{site}</span> : null}
        </a>
      );
    }
    case "toc": {
      const headings = collectHeadings(doc);
      if (headings.length === 0) return null;
      return (
        <div key={key} className="card bracket" style={{ marginBottom: 34 }}>
          <p className="eyebrow">Inhalt</p>
          <ul className="styled" style={{ margin: 0 }}>
            {headings.map((h) => (
              <li key={h.id} style={{ marginLeft: h.level === 3 ? 16 : 0 }}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "divider":
    case "horizontalRule":
      return <hr key={key} style={{ border: 0, borderTop: "1px solid var(--line-soft)", margin: "28px 0" }} />;
    default:
      return null; // unbekannt → verwerfen
  }
}

export default function RenderDocument({
  doc,
  assets,
  locale,
}: {
  doc: TiptapDoc;
  assets: AssetMap;
  locale: string;
}) {
  const ctx: RenderContext = { assets, locale };
  return (
    <div className="content-body">
      {doc.content.map((node, i) => renderNode(node, i, ctx, doc))}
    </div>
  );
}

/**
 * Rendert nur die Inline-Inhalte eines Feld-Dokuments (Text + Marks inkl.
 * Akzent/Highlight) flach — für Überschriften/Kurzfelder wie die Hero-Headline,
 * wo die Absatz-Struktur des Block-Renderers unerwünscht ist. Absätze werden
 * durch einen Zeilenumbruch getrennt.
 */
export function renderInlineFieldContent(doc: TiptapDoc): React.ReactNode {
  return doc.content.flatMap((block, bi) => {
    const inline = <React.Fragment key={`b${bi}`}>{renderInline(block.content)}</React.Fragment>;
    return bi === 0 ? [inline] : [<br key={`br${bi}`} />, inline];
  });
}
