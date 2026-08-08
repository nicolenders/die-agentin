import Link from "next/link";
import { db } from "@/lib/db";
import Flash from "@/components/admin/Flash";
import { createTalk, updateTalk } from "../actions";

export const metadata = { title: "Briefing bearbeiten · Zentrale" };

export default async function BriefingEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; err?: string }>;
}) {
  const { id, err } = await searchParams;

  const cats = await db.taxonomy.findMany({
    where: { kind: "TALK" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameDe: true },
  });

  const talk = id
    ? await db.talk.findUnique({ where: { id }, include: { translations: true, categories: true } })
    : null;

  if (id && !talk) {
    return (
      <section>
        <div style={{ marginBottom: 12 }}>
          <Link className="btn ghost sm" href="/admin/briefings">← Zurück</Link>
        </div>
        <p className="st">Briefing nicht gefunden.</p>
      </section>
    );
  }

  const de = talk?.translations.find((t) => t.locale === "de");
  const en = talk?.translations.find((t) => t.locale === "en");
  const isEdit = Boolean(talk);

  return (
    <section>
      <div style={{ marginBottom: 12 }}>
        <Link className="btn ghost sm" href="/admin/briefings">← Zurück zur Liste</Link>
      </div>
      <h1>{isEdit ? "Briefing bearbeiten" : "Neues Briefing"}</h1>
      <Flash err={err} />

      <div className="card bracket" style={{ marginTop: 16, maxWidth: 560 }}>
        <form action={isEdit ? updateTalk : createTalk}>
          {talk ? <input type="hidden" name="id" value={talk.id} /> : null}
          <label className="f">Titel (DE)</label>
          <input className="f" name="deTitle" defaultValue={de?.title ?? ""} required />
          <label className="f">Titel (EN)</label>
          <input className="f" name="enTitle" defaultValue={en?.title ?? ""} />
          <label className="f">Kategorien (Mehrfachauswahl)</label>
          <select className="f" name="categoryIds" multiple required size={Math.min(6, Math.max(3, cats.length))} defaultValue={talk?.categories.map((c) => c.id) ?? []} aria-label="Kategorien (Mehrfachauswahl)">
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.nameDe}</option>
            ))}
          </select>
          <p className="meta">Mehrere mit Strg/Cmd bzw. langem Tippen wählbar.</p>
          <label className="f">Level</label>
          <input className="f" name="level" defaultValue={talk?.level ?? ""} placeholder="300" />
          <label className="f">Dauer (Minuten)</label>
          <input className="f" name="durationMin" type="number" defaultValue={talk?.durationMin ?? undefined} placeholder="45" />
          {isEdit ? (
            <label className="f" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input type="checkbox" name="active" defaultChecked={talk?.active ?? true} />
              Aktiv (im öffentlichen Katalog sichtbar)
            </label>
          ) : null}
          <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>
            {isEdit ? "Änderungen speichern" : "Briefing anlegen"}
          </button>
        </form>
      </div>
    </section>
  );
}
