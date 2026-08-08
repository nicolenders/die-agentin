import { db } from "@/lib/db";
import { sanitizeDocument } from "@/lib/content/sanitize";
import { emptyDoc, type TiptapDoc } from "@/lib/content/schema";
import { utcToBerlinLocal } from "@/lib/time";
import DossierEditor, {
  type DossierEditorInitial,
  type DossierCategoryOption,
} from "@/components/admin/editor/DossierEditor";

export const metadata = { title: "Dossier bearbeiten · Zentrale" };

function parseDoc(json: string | undefined | null): TiptapDoc {
  if (!json) return emptyDoc();
  try {
    return sanitizeDocument(JSON.parse(json), "dossier");
  } catch {
    return emptyDoc();
  }
}

export default async function DossierEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let categories: DossierCategoryOption[] = [];
  try {
    const cats = await db.taxonomy.findMany({ where: { kind: "DOSSIER" }, orderBy: { sortOrder: "asc" } });
    categories = cats.map((c) => ({ id: c.id, name: c.nameDe }));
  } catch {
    // DB nicht erreichbar
  }

  let initial: DossierEditorInitial = {
    categoryIds: [],
    tocEnabled: true,
    publishAtLocal: "",
    de: { title: "", summary: "", doc: emptyDoc() },
    en: null,
  };

  if (id) {
    try {
      const dossier = await db.dossier.findUnique({ where: { id }, include: { translations: true, categories: true } });
      if (dossier) {
        const de = dossier.translations.find((t) => t.locale === "de");
        const en = dossier.translations.find((t) => t.locale === "en");
        initial = {
          dossierId: dossier.id,
          categoryIds: dossier.categories.map((c) => c.id),
          tocEnabled: de?.tocEnabled ?? true,
          publishAtLocal: utcToBerlinLocal(dossier.publishAt),
          de: { title: de?.title ?? "", summary: de?.summary ?? "", doc: parseDoc(de?.bodyJson) },
          en: en
            ? {
                title: en.title,
                summary: en.summary ?? "",
                doc: parseDoc(en.bodyJson),
                confirmed: en.state === "REVIEWED",
              }
            : null,
        };
      }
    } catch {
      // DB nicht erreichbar
    }
  }

  return <DossierEditor initial={initial} categories={categories} />;
}
