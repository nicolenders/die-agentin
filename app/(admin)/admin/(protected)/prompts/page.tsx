import Link from "next/link";
import Flash from "@/components/admin/Flash";
import PromptResult from "@/components/admin/PromptResult";
import {
  buildPromptValues,
  getIdentityOptions,
  getPromptSnippets,
  getPromptTemplates,
  getSubjectOptions,
  snippetMap,
  type IdentityOption,
  type PromptTemplateRow,
  type SubjectOption,
} from "@/lib/queries/prompts";
import { offersIdentityChoice, placeholdersFor, SUBJECT_LABELS } from "@/lib/prompts/catalog";
import { renderPrompt, type RenderResult } from "@/lib/prompts/render";
import type { PromptSubject } from "@/lib/domain";
import { installDefaultPrompts } from "./actions";

export const metadata = { title: "Prompts · Zentrale" };

// Die Werkbank. Links wählen, rechts steht der fertige Prompt. Die Auswahl
// steht in der Adresse (`?v=…&e=…&i=…`), damit ein Prompt, den man gerade
// gebaut hat, als Lesezeichen oder Link wieder auftaucht — und damit die Seite
// ohne JavaScript vollständig bedienbar bleibt.

const EDIT_PATH: Record<PromptSubject, string | null> = {
  MISSION: "/admin/einsaetze/bearbeiten?id=",
  TALK: "/admin/briefings/bearbeiten?id=",
  DISPATCH: "/admin/depeschen/bearbeiten?id=",
  IDENTITY: "/admin/identitaeten/bearbeiten?id=",
  NONE: null,
};

const KIND_LABEL = { IMAGE: "Bild", TEXT: "Text" } as const;

/** Wiederholte Adressparameter kommen als Array, einzelne als String. */
function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; e?: string; i?: string | string[]; ok?: string; err?: string }>;
}) {
  const { v, e, i, ok, err } = await searchParams;

  let templates: PromptTemplateRow[] = [];
  let dbError = false;
  try {
    templates = await getPromptTemplates();
  } catch {
    dbError = true;
  }

  const usable = templates.filter((t) => t.active);
  const selected = templates.find((t) => t.id === v) ?? usable[0] ?? null;

  let subjectOptions: SubjectOption[] = [];
  let identityOptions: IdentityOption[] = [];
  let result: RenderResult | null = null;
  let subjectId = "";
  let identityIds: string[] = [];

  if (selected && !dbError) {
    const wantsIdentities = offersIdentityChoice(selected.subject, selected.withIdentities);
    try {
      [subjectOptions, identityOptions] = await Promise.all([
        getSubjectOptions(selected.subject),
        wantsIdentities ? getIdentityOptions() : Promise.resolve<IdentityOption[]>([]),
      ]);
      // Nur Auswahlen übernehmen, die es auch gibt: nach einem Vorlagenwechsel
      // steht in der Adresse sonst noch der Eintrag der vorigen Vorlage.
      subjectId = subjectOptions.some((o) => o.id === e) ? e! : "";
      identityIds = asList(i).filter((id) => identityOptions.some((o) => o.id === id));

      const values = await buildPromptValues({
        subject: selected.subject,
        subjectId,
        identityIds,
        aspect: selected.aspect,
        now: new Date(),
      });
      const snippets = await getPromptSnippets();
      result = renderPrompt(selected.body, values, snippetMap(snippets));
    } catch {
      dbError = true;
    }
  }

  const needsSubject = selected !== null && selected.subject !== "NONE" && !subjectId;
  const labels = selected
    ? new Map(
        placeholdersFor(selected.subject, selected.withIdentities).map((p) => [p.key, p.label]),
      )
    : new Map<string, string>();
  const chosen = subjectOptions.find((o) => o.id === subjectId);
  const editPath = selected ? EDIT_PATH[selected.subject] : null;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Prompts</h1>
        <Link className="btn ghost sm" href="/admin/prompts/vorlagen" style={{ marginLeft: "auto" }}>
          Vorlagen und Bausteine
        </Link>
      </div>
      <p className="muted">
        Vorlage wählen, Eintrag dazu wählen, Prompt kopieren. Die Daten kommen aus dem Eintrag selbst —
        was dort gepflegt ist, steht im Prompt.
      </p>
      <Flash ok={ok} err={err} />
      {dbError ? (
        <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p>
      ) : null}

      {templates.length === 0 && !dbError ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Noch keine Vorlage</p>
          <p className="muted">
            Der mitgelieferte Satz deckt das Übliche ab: Motive zu Einsätzen, Briefings und Depeschen,
            Porträts im Markenstil, die Umschlag-Serie der Identitäten sowie Textprompts für Posts,
            Einreichungen und Foliengerüste. Du kannst danach alles ändern.
          </p>
          <form action={installDefaultPrompts}>
            <button className="btn solid" type="submit">Standardvorlagen einspielen</button>
          </form>
        </div>
      ) : null}

      {selected ? (
        <>
          <form method="get" className="card bracket" style={{ marginTop: 16 }}>
            <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
              <label className="f">
                Vorlage
                <select className="f" name="v" defaultValue={selected.id}>
                  {(["IMAGE", "TEXT"] as const).map((kind) => {
                    const group = usable.filter((t) => t.kind === kind);
                    if (group.length === 0) return null;
                    return (
                      <optgroup key={kind} label={KIND_LABEL[kind]}>
                        {group.map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {selected.active ? null : (
                    <option value={selected.id}>{selected.title} (ausgeblendet)</option>
                  )}
                </select>
              </label>

              {selected.subject === "NONE" ? (
                <p className="meta" style={{ alignSelf: "end" }}>
                  Diese Vorlage bezieht sich auf keinen Eintrag.
                </p>
              ) : (
                <label className="f">
                  {SUBJECT_LABELS[selected.subject]}
                  <select className="f" name="e" defaultValue={subjectId}>
                    <option value="">— bitte wählen —</option>
                    {subjectOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                        {o.hint ? ` · ${o.hint}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {identityOptions.length > 0 ? (
              <fieldset className="chip-fieldset">
                <legend className="f">Identität(en)</legend>
                <div className="chip-select">
                  {identityOptions.map((o) => (
                    <label key={o.id} className="chip-check">
                      <input
                        type="checkbox"
                        name="i"
                        value={o.id}
                        defaultChecked={identityIds.includes(o.id)}
                      />
                      <span aria-hidden className="chip-dot" style={{ background: o.color }} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <p className="meta">
                  Mehrere sind erlaubt. Sie werden im Prompt zusammengeführt, nicht gegeneinander
                  abgewogen.
                </p>
              </fieldset>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn solid" type="submit">Prompt erzeugen</button>
              {selected.purpose ? <span className="meta">{selected.purpose}</span> : null}
            </div>
          </form>

          {result ? (
            <div className="card bracket" style={{ marginTop: 16 }}>
              <p className="eyebrow">
                {KIND_LABEL[selected.kind]}
                {selected.aspect ? ` · ${selected.aspect}` : ""}
                {chosen ? ` · ${chosen.label}` : ""}
              </p>

              {needsSubject ? (
                <p className="meta" style={{ marginBottom: 10 }}>
                  Noch kein {SUBJECT_LABELS[selected.subject]} gewählt — unten steht nur der feste Teil
                  der Vorlage. Wähl oben einen aus, dann füllen sich die Angaben.
                </p>
              ) : null}

              <PromptResult text={result.text} />

              {result.missing.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <p className="meta">
                    Weggelassen, weil die Angabe fehlt:{" "}
                    {result.missing.map((key) => labels.get(key) ?? key).join(", ")}.
                    {chosen && editPath ? (
                      <>
                        {" "}
                        <Link href={`${editPath}${subjectId}`}>
                          {SUBJECT_LABELS[selected.subject]} „{chosen.label}“ ergänzen
                        </Link>
                        , dann hier erneut erzeugen.
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {result.unknownSnippets.length > 0 ? (
                <p className="meta" style={{ color: "var(--magenta)" }} role="alert">
                  Die Vorlage spricht Bausteine an, die es nicht gibt:{" "}
                  {result.unknownSnippets.join(", ")}.{" "}
                  <Link href="/admin/prompts/vorlagen">Bausteine anlegen oder Vorlage ändern</Link>.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {templates.length > 0 && usable.length === 0 && !dbError ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            Alle Vorlagen sind ausgeblendet. <Link href="/admin/prompts/vorlagen">Blend eine wieder ein</Link>,
            dann steht sie hier zur Wahl.
          </p>
        </div>
      ) : null}
    </section>
  );
}
