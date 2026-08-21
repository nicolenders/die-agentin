"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { isOneOf, PROMPT_KINDS, PROMPT_SUBJECTS } from "@/lib/domain";
import { DEFAULT_SNIPPETS, DEFAULT_TEMPLATES } from "@/lib/prompts/defaults";

// Schreibzugriffe der Prompt-Werkstatt. Jede Aktion prüft zuerst die Rolle;
// die Werkstatt liegt zwar hinter der Anmeldung, aber Sichtbarkeit ist keine
// Autorisierung.
//
// Nichts hier berührt öffentliche Inhalte, deshalb wird auch kein Cache-Tag
// invalidiert: Prompts erscheinen nirgends auf der Website.

const LIST = "/admin/prompts/vorlagen";
const EDIT = `${LIST}/bearbeiten`;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) != null;
}

function templateData(formData: FormData) {
  const kind = str(formData, "kind");
  const subject = str(formData, "subject");
  return {
    title: str(formData, "title"),
    kind: isOneOf(PROMPT_KINDS, kind) ? kind : "IMAGE",
    subject: isOneOf(PROMPT_SUBJECTS, subject) ? subject : "NONE",
    purpose: str(formData, "purpose") || null,
    body: String(formData.get("body") ?? "").trim(),
    withIdentities: bool(formData, "withIdentities"),
    aspect: str(formData, "aspect") || null,
    active: bool(formData, "active"),
  };
}

// --- Standardsatz -----------------------------------------------------------

/**
 * Spielt die mitgelieferten Bausteine und Vorlagen ein. Über den Schlüssel:
 * Vorhandenes wird nicht überschrieben, Fehlendes ergänzt. Der Knopf lässt
 * sich also gefahrlos ein zweites Mal drücken — eigene Änderungen an einer
 * Standardvorlage überlebt er.
 */
export async function installDefaultPrompts(): Promise<void> {
  await requireAdmin();
  let added = 0;
  let failed = false;
  try {
    const [templateKeys, snippetKeys] = await Promise.all([
      db.promptTemplate.findMany({ select: { key: true } }),
      db.promptSnippet.findMany({ select: { key: true } }),
    ]);
    const haveTemplate = new Set(templateKeys.map((t) => t.key));
    const haveSnippet = new Set(snippetKeys.map((s) => s.key));

    const newSnippets = DEFAULT_SNIPPETS.filter((s) => !haveSnippet.has(s.key));
    const newTemplates = DEFAULT_TEMPLATES.filter((t) => !haveTemplate.has(t.key));
    added = newSnippets.length + newTemplates.length;

    for (const [index, snippet] of newSnippets.entries()) {
      await db.promptSnippet.create({
        data: {
          key: snippet.key,
          title: snippet.title,
          body: snippet.body,
          note: snippet.note ?? null,
          sortOrder: index,
        },
      });
    }
    for (const [index, template] of newTemplates.entries()) {
      await db.promptTemplate.create({
        data: {
          key: template.key,
          title: template.title,
          kind: template.kind,
          subject: template.subject,
          purpose: template.purpose,
          body: template.body,
          withIdentities: template.withIdentities,
          aspect: template.aspect ?? null,
          sortOrder: index,
        },
      });
    }
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=${added > 0 ? "installed" : "nothing-new"}`);
}

// --- Vorlagen ---------------------------------------------------------------

export async function createPromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const data = templateData(formData);
  if (!data.title || !data.body) redirect(`${EDIT}?err=missing-fields`);

  const key = slugify(str(formData, "key") || data.title);
  if (!key) redirect(`${EDIT}?err=missing-slug`);

  let result: { id: string } | "key-taken" | "failed" = "failed";
  try {
    const taken = await db.promptTemplate.findUnique({ where: { key }, select: { id: true } });
    if (taken) {
      result = "key-taken";
    } else {
      const last = await db.promptTemplate.findFirst({ orderBy: { sortOrder: "desc" } });
      result = await db.promptTemplate.create({
        data: { ...data, key, sortOrder: (last?.sortOrder ?? 0) + 1 },
        select: { id: true },
      });
    }
  } catch {
    result = "failed";
  }
  if (result === "key-taken") redirect(`${EDIT}?err=key-taken`);
  if (result === "failed") redirect(`${EDIT}?err=failed`);
  redirect(`${EDIT}?id=${result.id}&ok=created`);
}

export async function updatePromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const data = templateData(formData);
  if (!data.title || !data.body) redirect(`${EDIT}?id=${id}&err=missing-fields`);

  try {
    await db.promptTemplate.update({ where: { id }, data });
  } catch {
    redirect(`${EDIT}?id=${id}&err=failed`);
  }
  redirect(`${EDIT}?id=${id}&ok=updated`);
}

export async function deletePromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  try {
    await db.promptTemplate.delete({ where: { id } });
  } catch {
    redirect(`${LIST}?err=failed`);
  }
  redirect(`${LIST}?ok=deleted`);
}

export async function togglePromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  try {
    const current = await db.promptTemplate.findUnique({ where: { id }, select: { active: true } });
    if (current) {
      await db.promptTemplate.update({ where: { id }, data: { active: !current.active } });
    }
  } catch {
    redirect(`${LIST}?err=failed`);
  }
  redirect(`${LIST}?ok=toggled`);
}

/**
 * Kopiert eine Vorlage. Der übliche Weg zu einer eigenen Fassung: Standard
 * duplizieren, Kopie ändern, Original ausblenden — so bleibt der Ausgangspunkt
 * erhalten.
 */
export async function duplicatePromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let result: { id: string } | "not-found" | "failed" = "failed";
  try {
    const source = await db.promptTemplate.findUnique({ where: { id } });
    if (!source) {
      result = "not-found";
    } else {
      const base = `${source.key}-kopie`;
      let key = base;
      for (let n = 2; await db.promptTemplate.findUnique({ where: { key }, select: { id: true } }); n += 1) {
        key = `${base}-${n}`;
      }
      result = await db.promptTemplate.create({
        data: {
          key,
          title: `${source.title} (Kopie)`,
          kind: source.kind,
          subject: source.subject,
          purpose: source.purpose,
          body: source.body,
          withIdentities: source.withIdentities,
          aspect: source.aspect,
          // Die Kopie startet ausgeblendet: erst ändern, dann in der Werkbank
          // anbieten.
          active: false,
          sortOrder: source.sortOrder + 1,
        },
        select: { id: true },
      });
    }
  } catch {
    result = "failed";
  }
  if (result === "not-found") redirect(`${LIST}?err=not-found`);
  if (result === "failed") redirect(`${LIST}?err=failed`);
  redirect(`${EDIT}?id=${result.id}&ok=created`);
}

export async function reorderPromptTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir");
  if (!id || (dir !== "up" && dir !== "down")) redirect(`${LIST}?err=not-found`);
  try {
    const all = await db.promptTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    const index = all.findIndex((t) => t.id === id);
    const target = dir === "up" ? index - 1 : index + 1;
    if (index >= 0 && target >= 0 && target < all.length) {
      // Reihenfolge komplett neu durchnummerieren: robust auch dann, wenn
      // Altdaten mehrfach dieselbe Nummer tragen.
      const next = [...all];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      await Promise.all(
        next.map((t, i) => db.promptTemplate.update({ where: { id: t.id }, data: { sortOrder: i } })),
      );
    }
  } catch {
    redirect(`${LIST}?err=failed`);
  }
  redirect(`${LIST}?ok=reordered`);
}

// --- Bausteine --------------------------------------------------------------

export async function savePromptSnippet(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const title = str(formData, "title");
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect(`${LIST}?err=missing-fields`);

  const key = slugify(str(formData, "key") || title);
  if (!key) redirect(`${LIST}?err=missing-slug`);
  const note = str(formData, "note") || null;

  let result: "ok" | "key-taken" | "failed" = "failed";
  try {
    if (id) {
      await db.promptSnippet.update({ where: { id }, data: { key, title, body, note } });
      result = "ok";
    } else {
      const taken = await db.promptSnippet.findUnique({ where: { key }, select: { id: true } });
      if (taken) {
        result = "key-taken";
      } else {
        const last = await db.promptSnippet.findFirst({ orderBy: { sortOrder: "desc" } });
        await db.promptSnippet.create({
          data: { key, title, body, note, sortOrder: (last?.sortOrder ?? 0) + 1 },
        });
        result = "ok";
      }
    }
  } catch {
    result = "failed";
  }
  if (result === "key-taken") redirect(`${LIST}?err=key-taken`);
  if (result === "failed") redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=${id ? "updated" : "created"}`);
}

/**
 * Löscht einen Baustein — aber nur, wenn ihn keine Vorlage mehr anspricht.
 * Sonst stünde in den betroffenen Prompts stillschweigend weniger, als drinstehen
 * soll; die Meldung sagt, welche Vorlagen zuerst zu ändern sind.
 */
export async function deletePromptSnippet(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let result: "ok" | "not-found" | "in-use" | "failed" = "failed";
  try {
    const snippet = await db.promptSnippet.findUnique({ where: { id }, select: { key: true } });
    if (!snippet) {
      result = "not-found";
    } else {
      const users = await db.promptTemplate.count({
        where: { body: { contains: `{{baustein.${snippet.key}}}` } },
      });
      if (users > 0) {
        result = "in-use";
      } else {
        await db.promptSnippet.delete({ where: { id } });
        result = "ok";
      }
    }
  } catch {
    result = "failed";
  }
  if (result === "not-found") redirect(`${LIST}?err=not-found`);
  if (result === "in-use") redirect(`${LIST}?err=snippet-in-use`);
  if (result === "failed") redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=deleted`);
}
