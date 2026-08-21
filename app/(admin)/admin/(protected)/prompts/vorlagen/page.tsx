import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import {
  getPromptSnippets,
  getPromptTemplates,
  type PromptSnippetRow,
  type PromptTemplateRow,
} from "@/lib/queries/prompts";
import { checkBody, SUBJECT_LABELS } from "@/lib/prompts/catalog";
import {
  deletePromptSnippet,
  deletePromptTemplate,
  duplicatePromptTemplate,
  installDefaultPrompts,
  reorderPromptTemplate,
  savePromptSnippet,
  togglePromptTemplate,
} from "../actions";

export const metadata = { title: "Prompt-Vorlagen · Zentrale" };

const KIND_LABEL = { IMAGE: "Bild", TEXT: "Text" } as const;

function SnippetCard({ snippet }: { snippet: PromptSnippetRow }) {
  return (
    <form action={savePromptSnippet} className="card bracket">
      <input type="hidden" name="id" value={snippet.id} />
      <p className="eyebrow" style={{ fontFamily: "var(--mono)" }}>
        {`{{baustein.${snippet.key}}}`}
      </p>
      <label className="f">
        Name
        <input className="f" name="title" defaultValue={snippet.title} required />
      </label>
      <label className="f">
        Schlüssel
        <input className="f" name="key" defaultValue={snippet.key} required />
      </label>
      <label className="f">
        Text
        <textarea className="f" name="body" defaultValue={snippet.body} rows={6} required />
      </label>
      <label className="f">
        Notiz für dich
        <input className="f" name="note" defaultValue={snippet.note} placeholder="wofür dieser Baustein da ist" />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn ghost sm" type="submit">Speichern</button>
        <ConfirmButton
          confirmText={`Baustein „${snippet.title}“ löschen? Das geht nur, wenn ihn keine Vorlage mehr anspricht.`}
          formAction={deletePromptSnippet}
          formNoValidate
        >
          Löschen
        </ConfirmButton>
      </div>
    </form>
  );
}

export default async function PromptTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let templates: PromptTemplateRow[] = [];
  let snippets: PromptSnippetRow[] = [];
  let dbError = false;
  try {
    [templates, snippets] = await Promise.all([getPromptTemplates(), getPromptSnippets()]);
  } catch {
    dbError = true;
  }

  const snippetKeys = snippets.map((s) => s.key);

  return (
    <section>
      <p className="meta"><Link href="/admin/prompts">← Zur Werkbank</Link></p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Vorlagen und Bausteine</h1>
        <Link className="btn solid sm" href="/admin/prompts/vorlagen/bearbeiten" style={{ marginLeft: "auto" }}>
          + Neue Vorlage
        </Link>
      </div>
      <p className="muted">
        Eine Vorlage ist ein Text mit Platzhaltern. Ein Baustein ist ein Stück Text, das in mehreren
        Vorlagen steckt — der Stil-Baustein etwa steht genau einmal hier und wirkt auf jedes Bild.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : null}

      <p className="eyebrow" style={{ marginTop: 24 }}>Vorlagen</p>
      {templates.length === 0 ? (
        <div className="card bracket">
          <p className="muted">
            Noch keine Vorlage. Spiel den mitgelieferten Satz ein — er deckt Bilder zu Einsätzen,
            Briefings, Depeschen und Identitäten ab sowie Textprompts für Posts, Einreichungen und
            Foliengerüste. Danach ist alles änderbar.
          </p>
          <form action={installDefaultPrompts}>
            <button className="btn solid" type="submit">Standardvorlagen einspielen</button>
          </form>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Vorlage</th>
              <th>Art</th>
              <th>Bezug</th>
              <th>Prüfung</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t, index) => {
              const problems = checkBody(t.body, t.subject, t.withIdentities, snippetKeys);
              const broken = problems.unknownPlaceholders.length + problems.unknownSnippets.length;
              return (
                <tr key={t.id}>
                  <td>
                    <b>{t.title}</b>
                    {t.purpose ? <div className="meta">{t.purpose}</div> : null}
                    <div className="meta" style={{ fontFamily: "var(--mono)" }}>{t.key}</div>
                  </td>
                  <td className="meta">
                    {KIND_LABEL[t.kind]}
                    {t.aspect ? <div className="meta">{t.aspect}</div> : null}
                  </td>
                  <td className="meta">
                    {SUBJECT_LABELS[t.subject]}
                    {t.withIdentities && t.subject !== "IDENTITY" ? (
                      <div className="meta">+ Identitäten</div>
                    ) : null}
                  </td>
                  <td className="meta">
                    {broken === 0 ? (
                      "in Ordnung"
                    ) : (
                      <span style={{ color: "var(--magenta)" }}>
                        {broken} Platzhalter ohne Entsprechung
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`st ${t.active ? "live" : ""}`} style={{ display: "inline-block" }}>
                      {t.active ? "Aktiv" : "Ausgeblendet"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={reorderPromptTemplate} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button className="btn ghost sm" type="submit" aria-label={`„${t.title}“ nach oben`} disabled={index === 0}>↑</button>
                    </form>{" "}
                    <form action={reorderPromptTemplate} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button className="btn ghost sm" type="submit" aria-label={`„${t.title}“ nach unten`} disabled={index === templates.length - 1}>↓</button>
                    </form>{" "}
                    <Link className="btn ghost sm" href={`/admin/prompts?v=${t.id}`}>Benutzen</Link>{" "}
                    <form action={togglePromptTemplate} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn ghost sm" type="submit">{t.active ? "Ausblenden" : "Einblenden"}</button>
                    </form>{" "}
                    <form action={duplicatePromptTemplate} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn ghost sm" type="submit">Duplizieren</button>
                    </form>{" "}
                    <Link className="btn ghost sm" href={`/admin/prompts/vorlagen/bearbeiten?id=${t.id}`}>Bearbeiten</Link>{" "}
                    <form action={deletePromptTemplate} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmButton confirmText={`Vorlage „${t.title}“ wirklich löschen?`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {templates.length > 0 ? (
        <form action={installDefaultPrompts} style={{ marginTop: 12 }}>
          <button className="btn ghost sm" type="submit">Fehlende Standardvorlagen nachtragen</button>
          <span className="meta"> Ergänzt nur, was fehlt. Deine Änderungen bleiben unberührt.</span>
        </form>
      ) : null}

      <p className="eyebrow" style={{ marginTop: 32 }}>Bausteine</p>
      <p className="meta">
        In einer Vorlage angesprochen als <code>{"{{baustein.schlüssel}}"}</code>. Ein Baustein darf
        selbst Platzhalter und weitere Bausteine enthalten.
      </p>
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        {snippets.map((s) => <SnippetCard key={s.id} snippet={s} />)}

        <form action={savePromptSnippet} className="card bracket">
          <p className="eyebrow">Neuer Baustein</p>
          <label className="f">
            Name
            <input className="f" name="title" placeholder="z. B. Stil-Baustein" required />
          </label>
          <label className="f">
            Schlüssel
            <input className="f" name="key" placeholder="wird aus dem Namen erzeugt" />
          </label>
          <label className="f">
            Text
            <textarea className="f" name="body" rows={6} required />
          </label>
          <label className="f">
            Notiz für dich
            <input className="f" name="note" placeholder="wofür dieser Baustein da ist" />
          </label>
          <button className="btn ghost sm" type="submit" style={{ marginTop: 10 }}>+ Anlegen</button>
        </form>
      </div>
    </section>
  );
}
