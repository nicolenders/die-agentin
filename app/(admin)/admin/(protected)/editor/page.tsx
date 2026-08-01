import { db } from "@/lib/db";
import { sanitizeDocument } from "@/lib/content/sanitize";
import { emptyDoc, type TiptapDoc } from "@/lib/content/schema";
import { utcToBerlinLocal } from "@/lib/time";
import PostEditor, { type PostEditorInitial } from "@/components/admin/editor/PostEditor";
import type { PostType } from "@/lib/domain";

export const metadata = { title: "Editor · Zentrale" };

function parseDoc(json: string | undefined | null): TiptapDoc {
  if (!json) return emptyDoc();
  try {
    return sanitizeDocument(JSON.parse(json), "post");
  } catch {
    return emptyDoc();
  }
}

// Editor-Seite. Lädt einen bestehenden Beitrag (?id=…) oder startet leer.
// Der Rollenschutz kommt aus dem (protected)-Layout.
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let initial: PostEditorInitial = {
    type: "NOTE",
    publishAtLocal: "",
    tags: "",
    de: { title: "", summary: "", social: "", doc: emptyDoc() },
    en: null,
  };

  if (id) {
    try {
      const post = await db.post.findUnique({
        where: { id },
        include: { translations: true, tags: { include: { tag: true } } },
      });
      if (post) {
        const de = post.translations.find((t) => t.locale === "de");
        const en = post.translations.find((t) => t.locale === "en");
        initial = {
          postId: post.id,
          type: post.type as PostType,
          publishAtLocal: utcToBerlinLocal(post.publishAt),
          tags: post.tags.map((pt) => pt.tag.nameDe).join(", "),
          de: {
            title: de?.title ?? "",
            summary: de?.summary ?? "",
            social: de?.socialText ?? "",
            doc: parseDoc(de?.bodyJson),
          },
          en: en
            ? {
                title: en.title,
                summary: en.summary ?? "",
                doc: parseDoc(en.bodyJson),
              }
            : null,
        };
      }
    } catch {
      // DB nicht erreichbar → leerer Editor
    }
  }

  return <PostEditor initial={initial} />;
}
