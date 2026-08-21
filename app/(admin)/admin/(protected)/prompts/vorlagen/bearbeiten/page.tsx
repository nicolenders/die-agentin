import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import {
  getPromptSnippets,
  getPromptTemplate,
  type PromptTemplateRow,
} from "@/lib/queries/prompts";
import {
  checkBody,
  COMMON_PLACEHOLDERS,
  IDENTITY_PLACEHOLDERS,
  placeholdersFor,
  SUBJECT_LABELS,
} from "@/lib/prompts/catalog";
import { PROMPT_SUBJECTS } from "@/lib/domain";
import { createPromptTemplate, updatePromptTemplate } from "../../actions";

export const metadata = { title: "Prompt-Vorlage bearbeiten · Zentrale" };

const EMPTY: PromptTemplateRow = {
  id: "",
  key: "",
  title: "",
  kind: "IMAGE",
  subject: "NONE",
  purpose: "",
  body: "",
  withIdentities: false,
  aspect: "",
  active: true,
  sortOrder: 0,
};

export default async function PromptTemplateEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ok?: string; err?: string }>;
}) {
  const { id, ok, err } = await searchParams;

  let data = EMPTY;
  if (id) {
    const loaded = await getPromptTemplate(id);
    if (!loaded) notFound();
    data = loaded;
  }
  const snippets = await getPromptSnippets();
  const isNew = !id;
  const action = isNew ? createPromptTemplate : updatePromptTemplate;

  // Die Prüfung läuft bei jedem Aufruf neu: sie hängt am gespeicherten Stand
  // und bleibt sichtbar, bis der Platzhalter stimmt.
  const problems = checkBody(data.body, data.subject, data.withIdentities, snippets.map((s) => s.key));

  // Nur die Platzhalter des eigenen Bezugs — die allgemeinen und die der
  // Identität stehen darunter in eigenen Gruppen.
  const own = placeholdersFor(data.subject, false)
    .filter((p) => !COMMON_PLACEHOLDERS.some((c) => c.key === p.key))
    .filter((p) => !IDENTITY_PLACEHOLDERS.some((i) => i.key === p.key));

  return (
    <section>
      <p className="meta"><Link href="/admin/prompts/vorlagen">← Alle Vorlagen</Link></p>
      <h1>{isNew ? "Neue Vorlage" : data.title}</h1>
      <Flash ok={ok} err={err} />

      {problems.unknownPlaceholders.length > 0 || problems.unknownSnippets.length > 0 ? (
        <div className="card bracket" style={{ marginTop: 12, borderColor: "var(--magenta)" }}>
          <p className="eyebrow" style={{ color: "var(--magenta)" }}>Zeigt ins Leere</p>
          {problems.unknownPlaceholders.length > 0 ? (
            <p className="meta">
              Diese Platzhalter gibt es beim Bezug „{SUBJECT_LABELS[data.subject]}“ nicht:{" "}
              <span style={{ fontFamily: "var(--mono)" }}>{problems.unknownPlaceholders.join(", ")}</span>.
              Sie bleiben im Prompt leer. Schreibweise prüfen oder Bezug ändern.
            </p>
          ) : null}
          {problems.unknownSnippets.length > 0 ? (
            <p className="meta">
              Diese Bausteine sind nicht angelegt:{" "}
              <span style={{ fontFamily: "var(--mono)" }}>{problems.unknownSnippets.join(", ")}</span>.{" "}
              <Link href="/admin/prompts/vorlagen">Baustein anlegen</Link>.
            </p>
          ) : null}
        </div>
      ) : null}

      <form action={action} style={{ marginTop: 16 }}>
        {id ? <input type="hidden" name="id" value={id} /> : null}

        <div className="card bracket">
          <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
            <label className="f">
              Name *
              <input className="f" name="title" defaultValue={data.title} required placeholder="z. B. Bild · Einsatz unter einer Identität" />
            </label>
            <label className="f">
              Schlüssel
              <input
                className="f"
                name="key"
                defaultValue={data.key}
                placeholder="wird aus dem Namen erzeugt"
                readOnly={!isNew}
                aria-describedby={isNew ? undefined : "key-hint"}
              />
              {isNew ? null : (
                <span className="meta" id="key-hint">
                  Bleibt, wie er ist: an ihm erkennt der Standardsatz diese Vorlage wieder.
                </span>
              )}
            </label>
            <label className="f">
              Art
              <select className="f" name="kind" defaultValue={data.kind}>
                <option value="IMAGE">Bild — Prompt für einen Bildgenerator</option>
                <option value="TEXT">Text — Prompt für einen Chat</option>
              </select>
            </label>
            <label className="f">
              Bezug
              <select className="f" name="subject" defaultValue={data.subject}>
                {PROMPT_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label className="f">
              Seitenverhältnis
              <input className="f" name="aspect" defaultValue={data.aspect} placeholder="z. B. 16:9 — steht als {{format}} zur Verfügung" />
            </label>
            <label className="f">
              Zweck
              <input className="f" name="purpose" defaultValue={data.purpose} placeholder="Ein Satz: wofür diese Vorlage da ist" />
            </label>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 6 }}>
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="withIdentities" defaultChecked={data.withIdentities} />
              Identitäten zur Auswahl anbieten
            </label>
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="active" defaultChecked={data.active} />
              In der Werkbank anbieten
            </label>
          </div>
          <p className="meta">
            Beim Bezug „Identität“ ist der gewählte Eintrag selbst die Identität — der Schalter bleibt
            dann ohne Wirkung.
          </p>
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <label className="f">
            Vorlagentext *
            <textarea className="f prompt-out" name="body" defaultValue={data.body} rows={18} required spellCheck={false} />
          </label>
          <p className="meta">
            <code>{"{{platzhalter}}"}</code> wird durch den Wert ersetzt ·{" "}
            <code>{"{{baustein.stil}}"}</code> setzt einen Baustein ein ·{" "}
            <code>{"[[… {{x}} …]]"}</code> fällt ganz weg, wenn <code>x</code> keinen Wert hat. Genau
            dafür ist die doppelte eckige Klammer da: Sie verhindert Satzreste wie „vor Personen in “.
          </p>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn solid" type="submit">{isNew ? "Vorlage anlegen" : "Speichern"}</button>
          {isNew ? null : (
            <Link className="btn ghost" href={`/admin/prompts?v=${data.id}`}>In der Werkbank ausprobieren</Link>
          )}
          <span className="meta">Name und Vorlagentext sind Pflicht.</span>
        </div>
      </form>

      <p className="eyebrow" style={{ marginTop: 32 }}>Verfügbare Platzhalter</p>
      <p className="meta">
        Für den gerade gespeicherten Bezug „{SUBJECT_LABELS[data.subject]}“. Nach einem Wechsel des
        Bezugs erst speichern, dann steht hier die neue Liste.
      </p>
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        {own.length > 0 ? (
          <div className="card bracket">
            <p className="eyebrow">{SUBJECT_LABELS[data.subject]}</p>
            <PlaceholderList items={own} />
          </div>
        ) : null}
        <div className="card bracket">
          <p className="eyebrow">Identität</p>
          <p className="meta">
            Verfügbar, sobald die Vorlage Identitäten einbezieht (oder ihr Bezug „Identität“ ist).
          </p>
          <PlaceholderList items={IDENTITY_PLACEHOLDERS} />
        </div>
        <div className="card bracket">
          <p className="eyebrow">Immer verfügbar</p>
          <PlaceholderList items={COMMON_PLACEHOLDERS} />
        </div>
        <div className="card bracket">
          <p className="eyebrow">Bausteine</p>
          {snippets.length === 0 ? (
            <p className="meta">
              Noch keine Bausteine. <Link href="/admin/prompts/vorlagen">Leg den ersten an</Link> — der
              Stil-Baustein gehört an jedes Bildmotiv.
            </p>
          ) : (
            <PlaceholderList
              items={snippets.map((s) => ({ key: `baustein.${s.key}`, label: s.title }))}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function PlaceholderList({ items }: { items: { key: string; label: string }[] }) {
  return (
    <table>
      <tbody>
        {items.map((p) => (
          <tr key={p.key}>
            <td style={{ fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{`{{${p.key}}}`}</td>
            <td className="meta">{p.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
