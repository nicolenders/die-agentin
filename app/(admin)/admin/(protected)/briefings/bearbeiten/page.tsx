import Link from "next/link";
import { db } from "@/lib/db";
import MaskBar from "@/components/admin/MaskBar";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import RichTextField from "@/components/admin/editor/RichTextField";
import { createTalk, updateTalk } from "../actions";

export const metadata = { title: "Briefing bearbeiten · Zentrale" };

export default async function BriefingEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; err?: string }>;
}) {
  const { id, err } = await searchParams;

  const [cats, audiences] = await Promise.all([
    db.taxonomy.findMany({
      where: { kind: "TALK" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameDe: true },
    }),
    db.taxonomy.findMany({
      where: { kind: "AUDIENCE" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameDe: true },
    }),
  ]);

  const talk = id
    ? await db.talk.findUnique({
        where: { id },
        include: { translations: true, categories: true, audiences: true },
      })
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
      <MaskBar title={isEdit ? "Briefing bearbeiten" : "Neues Briefing"} err={err}>
        <button className="btn solid sm" type="submit" form="talk-form">
          {isEdit ? "Änderungen speichern" : "Briefing anlegen"}
        </button>
      </MaskBar>

      <div className="card bracket" style={{ marginTop: 16, maxWidth: 560 }}>
        <form action={isEdit ? updateTalk : createTalk} id="talk-form">
          {talk ? <input type="hidden" name="id" value={talk.id} /> : null}
          <label className="f">Titel (DE)</label>
          <input className="f" name="deTitle" defaultValue={de?.title ?? ""} required />
          <label className="f">Titel (EN)</label>
          <input className="f" name="enTitle" defaultValue={en?.title ?? ""} />
          <label className="f">Vortragsinhalt (DE)</label>
          <RichTextField name="deAbstract" defaultValue={de?.abstract ?? ""} ariaLabel="Vortragsinhalt DE" />
          <label className="f" style={{ marginTop: 12 }}>Vortragsinhalt (EN)</label>
          <RichTextField name="enAbstract" defaultValue={en?.abstract ?? ""} ariaLabel="Vortragsinhalt EN" />
          <label className="f">Kategorien (Mehrfachauswahl)</label>
          <CategoryMultiSelect name="categoryIds" options={cats.map((c) => ({ id: c.id, name: c.nameDe }))} defaultSelected={talk?.categories.map((c) => c.id) ?? []} />
          <label className="f">Zielgruppe (Mehrfachauswahl)</label>
          <CategoryMultiSelect
            name="audienceIds"
            options={audiences.map((a) => ({ id: a.id, name: a.nameDe }))}
            defaultSelected={talk?.audiences.map((a) => a.id) ?? []}
            emptyHint="Erst eine Zielgruppe anlegen (Übersicht → Zielgruppen)."
          />
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
