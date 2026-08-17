import Link from "next/link";
import { db } from "@/lib/db";
import MaskBar from "@/components/admin/MaskBar";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import RichTextField from "@/components/admin/editor/RichTextField";
import { rankRelatedBriefings } from "@/lib/related-briefings";
import TalkSlidesManager from "@/components/admin/TalkSlidesManager";
import { getSlideTemplates } from "@/lib/queries/settings";
import { createTalk, updateTalk, removeTalkSlideDeck } from "../actions";

export const metadata = { title: "Briefing bearbeiten · Zentrale" };

export default async function BriefingEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; err?: string }>;
}) {
  const { id, err } = await searchParams;

  const [cats, audiences, tools] = await Promise.all([
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
    db.tool.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const talk = id
    ? await db.talk.findUnique({
        where: { id },
        include: {
          translations: true,
          categories: true,
          audiences: true,
          tools: { select: { id: true } },
          slideDecks: true,
        },
      })
    : null;

  // Die Vorlagen (Medien → Vorlagen) stehen hier zum Anfangen bereit — der Weg
  // ist: Vorlage laden, Folien bauen, Folien hier hinterlegen.
  const templates = await getSlideTemplates();

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

  // Verwandte Briefings: gleiche Kategorie (Thema), nach Überschneidung sortiert.
  let related: { id: string; title: string; categories: string; shared: number }[] = [];
  if (talk) {
    const targetCatIds = talk.categories.map((c) => c.id);
    if (targetCatIds.length > 0) {
      const others = await db.talk.findMany({
        where: { id: { not: talk.id }, categories: { some: { id: { in: targetCatIds } } } },
        include: { translations: { where: { locale: "de" } }, categories: { select: { id: true, nameDe: true } } },
      });
      const ranked = rankRelatedBriefings(
        targetCatIds,
        others.map((o) => ({ id: o.id, categoryIds: o.categories.map((c) => c.id), title: o.translations[0]?.title ?? "(ohne Titel)", categoryNames: o.categories.map((c) => c.nameDe) })),
      );
      related = ranked.map((r) => ({ id: r.item.id, title: r.item.title, categories: r.item.categoryNames.join(", "), shared: r.shared }));
    }
  }

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

      {/* Zwei Spalten: links Titel und Inhalt, rechts die Einordnung. Spart
          die halbe Seitenlänge gegenüber einem einspaltigen Endlosformular. */}
      <form action={isEdit ? updateTalk : createTalk} id="talk-form" className="form-2col" style={{ marginTop: 16 }}>
        {talk ? <input type="hidden" name="id" value={talk.id} /> : null}

        <div className="card bracket">
          <p className="eyebrow" style={{ marginTop: 0 }}>Titel und Inhalt</p>
          <label className="f">Titel (DE)</label>
          <input className="f" name="deTitle" defaultValue={de?.title ?? ""} required />
          <label className="f">Titel (EN)</label>
          <input className="f" name="enTitle" defaultValue={en?.title ?? ""} />
          <p className="meta" style={{ marginTop: 4 }}>
            Nur Briefings mit englischem Titel erscheinen bei einem Einsatz mit Vortragssprache Englisch.
          </p>
          <label className="f" style={{ marginTop: 12 }}>Vortragsinhalt (DE)</label>
          <RichTextField name="deAbstract" defaultValue={de?.abstract ?? ""} ariaLabel="Vortragsinhalt DE" />
          <label className="f" style={{ marginTop: 12 }}>Vortragsinhalt (EN)</label>
          <RichTextField name="enAbstract" defaultValue={en?.abstract ?? ""} ariaLabel="Vortragsinhalt EN" />
        </div>

        <div className="card bracket">
          <p className="eyebrow" style={{ marginTop: 0 }}>Einordnung</p>
          <label className="f">Kategorien (Mehrfachauswahl)</label>
          <CategoryMultiSelect name="categoryIds" options={cats.map((c) => ({ id: c.id, name: c.nameDe }))} defaultSelected={talk?.categories.map((c) => c.id) ?? []} />
          <label className="f" style={{ marginTop: 12 }}>Zielgruppe (Mehrfachauswahl)</label>
          <CategoryMultiSelect
            name="audienceIds"
            options={audiences.map((a) => ({ id: a.id, name: a.nameDe }))}
            defaultSelected={talk?.audiences.map((a) => a.id) ?? []}
            emptyHint="Erst eine Zielgruppe anlegen (Übersicht → Zielgruppen)."
          />
          <label className="f" style={{ marginTop: 12 }}>Werkzeuge (Mehrfachauswahl)</label>
          <CategoryMultiSelect
            name="toolIds"
            options={tools.map((t) => ({ id: t.id, name: t.name }))}
            defaultSelected={talk?.tools.map((t) => t.id) ?? []}
            emptyHint="Werkzeuge werden bei den Identitäten gepflegt."
          />
          <p className="meta" style={{ marginTop: 4 }}>Werden bei einem Einsatz mit diesem Briefing automatisch übernommen (dort anpassbar).</p>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ flex: 1 }}>
              <label className="f">Level</label>
              <input className="f" name="level" defaultValue={talk?.level ?? ""} placeholder="300" />
            </span>
            <span style={{ flex: 1 }}>
              <label className="f">Dauer (Minuten)</label>
              <input className="f" name="durationMin" type="number" defaultValue={talk?.durationMin ?? undefined} placeholder="45" />
            </span>
          </div>
          {isEdit ? (
            <>
              <label className="f" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <input type="checkbox" name="active" defaultChecked={talk?.active ?? true} style={{ width: "auto" }} />
                Aktiv (im öffentlichen Katalog sichtbar)
              </label>
              <label className="f" style={{ marginTop: 12 }}>Archiviert ab (leer = nicht archiviert)</label>
              <input
                className="f"
                type="date"
                name="archivedAt"
                defaultValue={talk?.archivedAt ? talk.archivedAt.toISOString().slice(0, 10) : ""}
                style={{ maxWidth: 200 }}
              />
              <p className="meta" style={{ marginTop: 4 }}>
                Ab diesem Tag verschwindet das Briefing aus dem öffentlichen Katalog und aus der
                Auswahl bei neuen Einsätzen. Einsätze <b>vor</b> diesem Tag behalten die Zuordnung
                und können sie auch nachträglich noch bekommen.
              </p>
            </>
          ) : null}
          <button className="btn solid sm" type="submit" style={{ marginTop: 16 }}>
            {isEdit ? "Änderungen speichern" : "Briefing anlegen"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <p className="eyebrow">Folien zu diesem Briefing</p>
        <p className="meta" style={{ marginTop: -6 }}>
          Je Sprache eine PowerPoint. Bei einem Einsatz wird der Foliensatz in der dort
          gewählten Vortragssprache zum Download angeboten — gepflegt wird er also einmal
          hier, nicht bei jedem Einsatz neu.
        </p>
        <TalkSlidesManager
          talkId={talk?.id ?? null}
          decks={(talk?.slideDecks ?? []).map((d) => ({
            locale: d.locale,
            fileName: d.fileName,
            bytes: d.bytes,
            blobPath: d.blobPath,
          }))}
          templates={templates}
          onRemove={removeTalkSlideDeck}
        />
      </div>

      {isEdit ? (
        <div className="card bracket" style={{ marginTop: 16, maxWidth: 560 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Verwandte Briefings</p>
          <p className="meta" style={{ marginTop: 6 }}>Gleiches Thema (gemeinsame Kategorie), nach Überschneidung sortiert.</p>
          {related.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Noch keine verwandten Briefings — ein anderes Briefing mit gleicher Kategorie erscheint hier.</p>
          ) : (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {related.map((r) => (
                <li key={r.id} style={{ marginBottom: 4 }}>
                  <Link href={`/admin/briefings/bearbeiten?id=${r.id}`}>{r.title}</Link>{" "}
                  <span className="meta">· {r.categories} · {r.shared} gemeinsame {r.shared === 1 ? "Kategorie" : "Kategorien"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
