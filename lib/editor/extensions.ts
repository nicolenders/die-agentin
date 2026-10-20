import { Node, Mark, mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import type { ContentContext, MarginSide, ImageLayout } from "@/lib/content/schema";

// Marken-Akzent als Inline-Mark: hebt Wörter im Verlauf hervor (Hero-Headline,
// betonte Stellen in Feldern). Rendert als <span class="accent"> — dieselbe
// Klasse nutzt der öffentliche Renderer. Umschalten über toggleMark("highlight").
const Highlight = Mark.create({
  name: "highlight",
  parseHTML() {
    return [{ tag: "span.accent" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "accent" }), 0];
  },
});

// TipTap-Erweiterungen (SPEC §4). StarterKit deckt Text, Überschriften, Listen,
// Zitat, Code, Trenner und Marks (inkl. Link/Underline) ab. Die spezialisierten
// Bausteine sind als Block-Atoms ergänzt; ihre Attribute landen im JSON und
// werden vom gemeinsamen Renderer dargestellt.

interface JsonAttr {
  default: null;
}
const jsonAttr: JsonAttr = { default: null };

// Absatz mit optionalem Marginalbild (SPEC §4).
const MarginParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      marginAsset: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-margin-asset");
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.marginAsset
            ? { "data-margin-asset": JSON.stringify(attrs.marginAsset) }
            : {},
      },
    };
  },
});

function blockAtom(name: string, label: (attrs: Record<string, unknown>) => string) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        assetId: jsonAttr,
        assetIds: jsonAttr,
        caption: jsonAttr,
        layout: { default: "full" },
        url: jsonAttr,
        title: jsonAttr,
        site: jsonAttr,
        image: jsonAttr,
        provider: { default: "youtube" },
        videoId: jsonAttr,
        videos: jsonAttr,
      };
    },
    parseHTML() {
      return [{ tag: `div[data-type="${name}"]` }];
    },
    renderHTML({ HTMLAttributes, node }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, { "data-type": name, class: "ph" }),
        label(node.attrs),
      ];
    },
  });
}

const imageLabel = (a: Record<string, unknown>) => `Bild${a.caption ? `: ${a.caption}` : ""}`;
const ImageNode = blockAtom("image", imageLabel);

/** Was der Editor von einem Pool-Bild zum Anzeigen braucht. */
export interface PoolPreview {
  url: string;
}

/**
 * Bild-Block für Felder mit Bilder-Pool (Depeschen, ADR 0033). Zeigt im Editor
 * das Bild selbst statt eines Platzhalters, damit man sieht, welches der
 * Pool-Bilder an der Stelle steht. `pool` ist eine Map, die der Aufrufer
 * fortschreibt — so kennt auch ein Editor, der vor dem Hinzufügen eines Bildes
 * entstand, dessen URL.
 */
const PoolImageNode = ImageNode.extend<{ pool: Map<string, PoolPreview> }>({
  addOptions() {
    return { pool: new Map<string, PoolPreview>() };
  },
  renderHTML({ HTMLAttributes, node }) {
    const assetId = node.attrs.assetId;
    const hit = typeof assetId === "string" ? this.options.pool.get(assetId) : undefined;
    if (!hit) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image", class: "ph" }), imageLabel(node.attrs)];
    }
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "image", class: "rich-image" }),
      ["img", { src: hit.url, alt: "" }],
      ["span", {}, imageLabel(node.attrs)],
    ];
  },
});
const GalleryNode = blockAtom(
  "gallery",
  (a) => `Galerie (${Array.isArray(a.assetIds) ? a.assetIds.length : 0} Bilder)`,
);
const VideoNode = blockAtom("video", (a) => `Video · ${a.videoId ?? "YouTube"}`);
const VideoGalleryNode = blockAtom("videoGallery", () => "Videogalerie");
const LinkCardNode = blockAtom("linkCard", (a) => `Link-Karte: ${a.title ?? a.url ?? ""}`);
const TocNode = blockAtom("toc", () => "Inhaltsverzeichnis");

/**
 * Baut die Erweiterungsliste für einen Kontext. Galerie/Video/TOC nur, wo
 * erlaubt (SPEC §4).
 */
export function buildExtensions(
  context: ContentContext,
  options: { imagePool?: Map<string, PoolPreview> } = {},
): Extensions {
  // Schlanker Feld-Editor: nur Fließtext-Formatierung + Akzent, keine Blöcke.
  // Mit Bilder-Pool zusätzlich der Bild-Block — sonst nichts.
  if (context === "field" || context === "fieldImages") {
    const field: Extensions = [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener" } },
      }),
      Highlight,
    ];
    if (options.imagePool) field.push(PoolImageNode.configure({ pool: options.imagePool }));
    return field;
  }

  const base: Extensions = [
    StarterKit.configure({
      paragraph: false, // durch MarginParagraph ersetzt
      heading: { levels: [2, 3] },
      link: { openOnClick: false, HTMLAttributes: { rel: "noopener" } },
    }),
    MarginParagraph,
    ImageNode,
    Highlight,
  ];
  if (context === "post") {
    base.push(LinkCardNode);
  }
  if (context === "dossier" || context === "mission") {
    base.push(GalleryNode);
  }
  if (context === "dossier") {
    base.push(VideoNode, VideoGalleryNode, TocNode);
  }
  return base;
}

export type { MarginSide, ImageLayout };
