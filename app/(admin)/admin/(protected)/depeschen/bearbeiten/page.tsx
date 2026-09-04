import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Flash from "@/components/admin/Flash";
import FormTabs, { type FormTabDef } from "@/components/admin/FormTabs";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import { assetUrl } from "@/lib/media/url";
import { identityDisplayName } from "@/lib/identities";
import { utcToBerlinLocal } from "@/lib/time";
import { DISPATCH_FORMATS, CONTENT_STATUSES } from "@/lib/domain";
import { RETURN_PARAM, safeReturnTo } from "@/lib/admin/return-to";
import {
  createDispatch,
  createFocusTopicInline,
  createTopicInline,
  updateDispatch,
} from "../actions";

export const metadata = { title: "Depesche bearbeiten · Zentrale" };

export default async function DispatchEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ok?: string; err?: string; zurueck?: string }>;
}) {
  const { id, ok, err, zurueck } = await searchParams;
  // Wer aus einer gefilterten Liste kam, kommt auch dorthin zurück.
  const backToList = safeReturnTo(zurueck, "/admin/depeschen");

  const [identities, topics, focusTopics, dispatch] = await Promise.all([
    db.identity.findMany({ orderBy: { sortOrder: "asc" } }),
    db.taxonomy.findMany({ where: { kind: "DOSSIER" }, orderBy: { sortOrder: "asc" } }),
    db.focusTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true, titleDe: true } }),
    id
      ? db.dispatch.findUnique({
          where: { id },
          include: {
            translations: true,
            identities: { select: { id: true } },
            topics: { select: { id: true } },
            focusTopics: { select: { id: true } },
            heroAsset: true,
          },
        })
      : Promise.resolve(null),
  ]);
  if (id && !dispatch) notFound();
  const isNew = !dispatch;

  const de = dispatch?.translations.find((t) => t.locale === "de");
  const en = dispatch?.translations.find((t) => t.locale === "en");
  const identityOpts = identities.map((i) => ({ id: i.id, name: identityDisplayName(i, "de") }));
  const topicOpts = topics.map((t) => ({ id: t.id, name: t.nameDe }));
  const focusOpts = focusTopics.map((t) => ({ id: t.id, name: t.titleDe }));
  const action = isNew ? createDispatch : updateDispatch;

  const stammdaten = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="grid g2" style={{ gap: 14 }}>
        <label className="f">Format
          <select className="f" name="format" defaultValue={dispatch?.format ?? "NOTE"}>
            {DISPATCH_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="f">Status
          <select className="f" name="status" defaultValue={dispatch?.status ?? "DRAFT"}>
            {CONTENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="f">Veröffentlicht am (Berlin)
          <input className="f" type="datetime-local" name="publishedAt" defaultValue={utcToBerlinLocal(dispatch?.publishedAt)} />
        </label>
        <label className="f">Zuletzt geprüft (nur REFERENCE)
          <input className="f" type="datetime-local" name="reviewedAt" defaultValue={utcToBerlinLocal(dispatch?.reviewedAt)} />
        </label>
      </div>
      <div>
        <label className="f">Identität(en)</label>
        <CategoryMultiSelect options={identityOpts} name="identityIds" groupLabel="Identitäten" defaultSelected={dispatch?.identities.map((i) => i.id) ?? []} emptyHint="Keine Identitäten." />
      </div>
      <div>
        <label className="f">Fachgebiete</label>
        <CategoryMultiSelect
          options={topicOpts}
          name="topicIds"
          groupLabel="Fachgebiete"
          defaultSelected={dispatch?.topics.map((t) => t.id) ?? []}
          emptyHint="Noch keine Fachgebiete angelegt. Das erste legst du gleich hier an."
          create={createTopicInline}
          createLabel="Fehlt eins? Hier anlegen"
        />
        <p className="meta" style={{ marginTop: 6 }}>
          Werkzeuge und Produkte, etwa Copilot Studio oder Purview. Hier angelegte Fachgebiete
          stehen danach überall zur Verfügung; die englische Bezeichnung trägst du bei Gelegenheit
          unter Stammdaten nach.
        </p>
      </div>
      <div>
        <label className="f">Radar-Themen (Aufklärung)</label>
        <CategoryMultiSelect
          options={focusOpts}
          name="focusTopicIds"
          groupLabel="Radar-Themen"
          defaultSelected={dispatch?.focusTopics.map((t) => t.id) ?? []}
          emptyHint="Noch kein Radar-Thema angelegt. Das erste legst du gleich hier an."
          create={createFocusTopicInline}
          createLabel="Fehlt eins? Hier anlegen"
          relatedField="identityIds"
        />
        <p className="meta" style={{ marginTop: 6 }}>
          Öffentlich wird der Radar-Punkt dadurch anklickbar und filtert die Depeschenliste auf dieses
          Thema. Ein hier angelegtes Thema übernimmt die oben gewählten Identitäten und damit seine
          Farbe. Sparsam bleiben: ein Radar mit zwanzig Punkten sagt nichts mehr aus.
        </p>
      </div>
      <div className="grid g3" style={{ gap: 14, alignItems: "start" }}>
        <label className="f">Quelle-URL (kuratierter Fund)
          <input className="f" name="sourceUrl" defaultValue={dispatch?.sourceUrl ?? ""} placeholder="https://…" />
        </label>
        <label className="f">Quelle-Titel
          <input className="f" name="sourceTitle" defaultValue={dispatch?.sourceTitle ?? ""} />
        </label>
        <label className="f">Quelle-Seite
          <input className="f" name="sourceSite" defaultValue={dispatch?.sourceSite ?? ""} />
        </label>
      </div>
      <div>
        <label className="f">Hero-Bild (optional)</label>
        <AssetPickerField name="heroAssetId" initialAssetId={dispatch?.heroAssetId ?? null} initialUrl={dispatch?.heroAsset ? assetUrl(dispatch.heroAsset.blobPath) : null} aspectRatio="16 / 9" emptyHint="Kein Bild" />
      </div>
    </div>
  );

  const deutsch = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="f">Titel (DE) *<input className="f" name="deTitle" defaultValue={de?.title ?? ""} required /></label>
      <label className="f">Slug (DE)<input className="f" name="deSlug" defaultValue={de?.slug ?? ""} placeholder="aus Titel" /></label>
      <label className="f">Kurzfassung (DE)<textarea className="f" name="deSummary" defaultValue={de?.summary ?? ""} rows={2} /></label>
      <div><label className="f">Text (DE)</label><RichTextField name="deBody" defaultValue={de?.bodyJson ?? null} ariaLabel="Text DE" /></div>
    </div>
  );

  const englisch = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="meta">EN ist optional. Bleibt EN leer, zeigt die englische Seite den deutschen Inhalt mit Hinweis.</p>
      <label className="f">Titel (EN)<input className="f" name="enTitle" defaultValue={en?.title ?? ""} /></label>
      <label className="f">Slug (EN)<input className="f" name="enSlug" defaultValue={en?.slug ?? ""} placeholder="aus Titel" /></label>
      <label className="f">Kurzfassung (EN)<textarea className="f" name="enSummary" defaultValue={en?.summary ?? ""} rows={2} /></label>
      <div><label className="f">Text (EN)</label><RichTextField name="enBody" defaultValue={en?.bodyJson ?? null} ariaLabel="Text EN" /></div>
    </div>
  );

  const tabs: FormTabDef[] = [
    { id: "stammdaten", label: "Stammdaten", content: stammdaten },
    { id: "de", label: "Deutsch", content: deutsch },
    { id: "en", label: "English", content: englisch },
  ];

  return (
    <section>
      <p className="meta"><Link href={backToList}>← Alle Depeschen</Link></p>
      <h1>{isNew ? "Neue Depesche" : de?.title || "Depesche"}</h1>
      <Flash ok={ok} err={err} />
      <form action={action} style={{ marginTop: 16 }}>
        {id ? <input type="hidden" name="id" value={id} /> : null}
        {/* Der Rückweg überlebt das Speichern: die Maske bleibt stehen, der
            Link „Alle Depeschen" führt danach weiter in die gefilterte Liste. */}
        <input type="hidden" name={RETURN_PARAM} value={backToList} />
        <div className="card bracket"><FormTabs tabs={tabs} /></div>
        <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn solid" type="submit">{isNew ? "Anlegen" : "Speichern"}</button>
          <span className="meta">Titel (DE) ist Pflicht. Öffentlich sichtbar bei Status PUBLISHED und Datum in der Vergangenheit.</span>
        </div>
      </form>
    </section>
  );
}
