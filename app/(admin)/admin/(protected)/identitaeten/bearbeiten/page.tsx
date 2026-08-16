import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import FormTabs, { type FormTabDef } from "@/components/admin/FormTabs";
import RichTextField from "@/components/admin/editor/RichTextField";
import AssetPickerField from "@/components/admin/AssetPickerField";
import CategoryMultiSelect from "@/components/admin/CategoryMultiSelect";
import IdentityToolsField from "@/components/admin/IdentityToolsField";
import StringListField from "@/components/admin/StringListField";
import IdentityAttributesField from "@/components/admin/IdentityAttributesField";
import ColorField from "@/components/admin/ColorField";
import { getIdentityForEdit, getLinkOptions, type IdentityEditData } from "@/lib/queries/identities";
import { createIdentity, updateIdentity } from "../actions";

export const metadata = { title: "Identität bearbeiten · Zentrale" };

const EMPTY: IdentityEditData = {
  id: "", slug: "", codenameDe: "", codenameEn: "", roleDe: "", roleEn: "", taglineDe: "", taglineEn: "",
  registryCode: "", since: "", descriptionDe: "", descriptionEn: "", shortBioDe: "", shortBioEn: "",
  focusDe: [], focusEn: [], languages: [], color: "#8B5CF6", iconKey: "", isPrimary: false, published: false,
  metaTitleDe: "", metaTitleEn: "", metaDescriptionDe: "", metaDescriptionEn: "",
  portraitAssetId: null, portraitUrl: null, envelopeAssetId: null, envelopeUrl: null, ogAssetId: null, ogUrl: null,
  toolIds: [], missionIds: [], talkIds: [], publicationIds: [], certificationIds: [], focusTopicIds: [], attributes: [],
};

function labelPair(labelDe: string) {
  return labelDe;
}

export default async function IdentityEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ok?: string; err?: string }>;
}) {
  const { id, ok, err } = await searchParams;

  let data = EMPTY;
  if (id) {
    const loaded = await getIdentityForEdit(id);
    if (!loaded) notFound();
    data = loaded;
  }
  const options = await getLinkOptions();
  const isNew = !id;

  // Nicht-blockierende Warnungen (Phase 2.6) — im Formular anzeigen.
  const warnings: string[] = [];
  if (!isNew) {
    if (!data.codenameDe.trim()) warnings.push("Deckname (DE) fehlt — Anzeige fällt auf die Rolle zurück.");
    if (!data.roleEn.trim()) warnings.push("Rolle (EN) fehlt.");
    if (!data.envelopeAssetId) warnings.push("Umschlag-Motiv fehlt (für Identitätsseite und OG-Image).");
    const linked = data.missionIds.length + data.talkIds.length + data.publicationIds.length + data.certificationIds.length;
    if (linked === 0) warnings.push("Noch keine Einträge verknüpft — die Identität belegt nichts.");
  }

  const action = isNew ? createIdentity : updateIdentity;

  const stammdaten = (
    <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
      <label className="f">{labelPair("Deckname (DE)")}
        <input className="f" name="codenameDe" defaultValue={data.codenameDe} placeholder="z. B. Die Collaboration-Expertin" />
      </label>
      <label className="f">Deckname (EN)
        <input className="f" name="codenameEn" defaultValue={data.codenameEn} />
      </label>
      <label className="f">Rolle (DE) *
        <input className="f" name="roleDe" defaultValue={data.roleDe} required placeholder="z. B. Microsoft Teams & Collaboration" />
      </label>
      <label className="f">Rolle (EN)
        <input className="f" name="roleEn" defaultValue={data.roleEn} />
      </label>
      <label className="f">Tagline (DE)
        <input className="f" name="taglineDe" defaultValue={data.taglineDe} placeholder="Ein Satz, für Karte und Umschlag" />
      </label>
      <label className="f">Tagline (EN)
        <input className="f" name="taglineEn" defaultValue={data.taglineEn} />
      </label>
      <label className="f">Slug
        <input className="f" name="slug" defaultValue={data.slug} placeholder="wird aus der Rolle erzeugt" />
      </label>
      <label className="f">Kennung (dekorativ)
        <input className="f" name="registryCode" defaultValue={data.registryCode} placeholder="z. B. ID-04" />
      </label>
      {/* „seit" und die Sprachliste sind bewusst nicht mehr pflegbar: beide
          erschienen öffentlich, sagten aber nichts, was die Rolle nicht besser
          sagt. Die Spalten bleiben vorerst im Schema (abwärtskompatibel). */}
    </div>
  );

  const beschreibung = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label className="f">Beschreibung (DE) — mehrere Absätze</label>
        <RichTextField name="descriptionDe" defaultValue={data.descriptionDe} ariaLabel="Beschreibung DE" />
      </div>
      <div>
        <label className="f">Beschreibung (EN)</label>
        <RichTextField name="descriptionEn" defaultValue={data.descriptionEn} ariaLabel="Beschreibung EN" />
      </div>
      <div className="grid g2" style={{ gap: 14 }}>
        <label className="f">Kurzbio (DE) — 2–3 Sätze, für Speaker-Kit/OG
          <textarea className="f" name="shortBioDe" defaultValue={data.shortBioDe} rows={3} />
        </label>
        <label className="f">Kurzbio (EN)
          <textarea className="f" name="shortBioEn" defaultValue={data.shortBioEn} rows={3} />
        </label>
      </div>
      <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
        <div>
          <label className="f">Fokus / womit sie sich gerade beschäftigt (DE)</label>
          <StringListField name="focusDe" initial={data.focusDe} placeholder="Stichpunkt" addLabel="Stichpunkt" />
        </div>
        <div>
          <label className="f">Fokus (EN)</label>
          <StringListField name="focusEn" initial={data.focusEn} placeholder="Bullet point" addLabel="Bullet" />
        </div>
      </div>
    </div>
  );

  const bilder = (
    <div className="grid g3" style={{ gap: 18, alignItems: "start" }}>
      <div>
        <label className="f">Portrait („Ausweisfoto“, 1:1)</label>
        <AssetPickerField name="portraitAssetId" initialAssetId={data.portraitAssetId} initialUrl={data.portraitUrl} aspectRatio="1 / 1" emptyHint="Kein Portrait gewählt" />
      </div>
      <div>
        <label className="f">Umschlag-Motiv (4:5)</label>
        <AssetPickerField name="envelopeAssetId" initialAssetId={data.envelopeAssetId} initialUrl={data.envelopeUrl} aspectRatio="4 / 5" emptyHint="Kein Umschlag gewählt" />
      </div>
      <div>
        <label className="f">OG-Bild (optional, überschreibt generiert)</label>
        <AssetPickerField name="ogAssetId" initialAssetId={data.ogAssetId} initialUrl={data.ogUrl} aspectRatio="1200 / 630" emptyHint="Aus Design generiert" />
      </div>
    </div>
  );

  const darstellung = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label className="f">Akzentfarbe *</label>
        <ColorField name="color" initial={data.color} />
      </div>
      <label className="f">Icon-Kürzel (optional)
        <input className="f" name="iconKey" defaultValue={data.iconKey} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="isPrimary" defaultChecked={data.isPrimary} />
        <span>Auf der Startseite hervorheben (isPrimary)</span>
      </label>
    </div>
  );

  const werkzeuge = (
    <IdentityToolsField initialOptions={options.tools} defaultSelected={data.toolIds} />
  );

  const merkmale = (
    <div>
      <p className="meta">Freie Merkmale (Phase 2.2) — was heute nicht ins Schema passt, landet hier statt in einer Migration.</p>
      <IdentityAttributesField
        name="attributes"
        initial={data.attributes.map((a) => ({ labelDe: a.labelDe, labelEn: a.labelEn, valueDe: a.valueDe, valueEn: a.valueEn, displayPublic: a.displayPublic }))}
      />
    </div>
  );

  const verknuepft = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label className="f">Einsätze</label>
        <CategoryMultiSelect options={options.missions} name="missionIds" defaultSelected={data.missionIds} emptyHint="Keine Einsätze vorhanden." />
      </div>
      <div>
        <label className="f">Briefings</label>
        <CategoryMultiSelect options={options.talks} name="talkIds" defaultSelected={data.talkIds} emptyHint="Keine Briefings vorhanden." />
      </div>
      <div>
        <label className="f">Publikationen</label>
        <CategoryMultiSelect options={options.publications} name="publicationIds" defaultSelected={data.publicationIds} emptyHint="Keine Publikationen vorhanden." />
      </div>
      <div>
        <label className="f">Zertifizierungen</label>
        <CategoryMultiSelect options={options.certifications} name="certificationIds" defaultSelected={data.certificationIds} emptyHint="Keine Zertifizierungen vorhanden." />
      </div>
      <div>
        <label className="f">Aktuelle Themen (Radar)</label>
        <CategoryMultiSelect options={options.focusTopics} name="focusTopicIds" defaultSelected={data.focusTopicIds} emptyHint="Noch keine Themen unter „Aufklärung (Radar)“ angelegt." />
        <p className="meta" style={{ marginTop: 6 }}>Womit ich mich gerade beschäftige — erscheint auf der Detailseite dieser Identität. Themen werden unter „Aufklärung (Radar)“ gepflegt.</p>
      </div>
      <p className="meta">Depeschen werden ab Phase 3 verknüpfbar.</p>
    </div>
  );

  const seo = (
    <div className="grid g2" style={{ gap: 14, alignItems: "start" }}>
      <label className="f">Meta-Titel (DE)
        <input className="f" name="metaTitleDe" defaultValue={data.metaTitleDe} placeholder="sonst aus Deckname/Rolle" />
      </label>
      <label className="f">Meta-Titel (EN)
        <input className="f" name="metaTitleEn" defaultValue={data.metaTitleEn} />
      </label>
      <label className="f">Meta-Beschreibung (DE)
        <textarea className="f" name="metaDescriptionDe" defaultValue={data.metaDescriptionDe} rows={2} placeholder="sonst aus Kurzbio" />
      </label>
      <label className="f">Meta-Beschreibung (EN)
        <textarea className="f" name="metaDescriptionEn" defaultValue={data.metaDescriptionEn} rows={2} />
      </label>
      <p className="meta" style={{ gridColumn: "1 / -1" }}>Das generierte OG-Image folgt in Phase 13.</p>
    </div>
  );

  const tabs: FormTabDef[] = [
    { id: "stammdaten", label: "Stammdaten", content: stammdaten },
    { id: "beschreibung", label: "Beschreibung", content: beschreibung },
    { id: "bilder", label: "Bilder", content: bilder },
    { id: "darstellung", label: "Darstellung", content: darstellung },
    { id: "werkzeuge", label: "Werkzeuge", content: werkzeuge },
    { id: "merkmale", label: "Merkmale", content: merkmale },
    { id: "verknuepft", label: "Verknüpftes", content: verknuepft },
    { id: "seo", label: "SEO", content: seo },
  ];

  return (
    <section>
      <p className="meta"><Link href="/admin/identitaeten">← Alle Identitäten</Link></p>
      <h1>{isNew ? "Neue Identität" : data.codenameDe || data.roleDe || "Identität"}</h1>
      <Flash ok={ok} err={err} />
      {warnings.length > 0 ? (
        <div className="card bracket" style={{ marginTop: 12, borderColor: "var(--warn)" }}>
          <p className="eyebrow" style={{ color: "var(--warn)" }}>Hinweise</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {warnings.map((w) => <li key={w} className="meta">{w}</li>)}
          </ul>
        </div>
      ) : null}

      <form action={action} style={{ marginTop: 16 }}>
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <div className="card bracket">
          <FormTabs tabs={tabs} />
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn solid" type="submit">{isNew ? "Identität anlegen" : "Speichern"}</button>
          <span className="meta">Rolle (DE) und Akzentfarbe sind Pflicht. Veröffentlichen geschieht in der Übersicht.</span>
        </div>
      </form>
    </section>
  );
}
