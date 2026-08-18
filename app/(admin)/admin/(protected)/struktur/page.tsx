import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  createTag,
  renameTag,
  deleteTag,
  createRedirect,
  deleteRedirect,
} from "./actions";

export const metadata = { title: "Struktur · Zentrale" };

type Cat = { id: string; nameDe: string; nameEn: string; count: number };

function CategoryCard({
  title,
  kind,
  cats,
  usageLabel,
}: {
  title: string;
  kind: "DOSSIER" | "CERTIFICATION";
  cats: Cat[];
  usageLabel: string;
}) {
  return (
    <div className="card bracket">
      <p className="eyebrow">{title}</p>
      {cats.length === 0 ? (
        <p className="muted">Noch keine Kategorien.</p>
      ) : (
        <table>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td>
                  <form action={renameCategory} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input className="f" name="nameDe" defaultValue={c.nameDe} style={{ maxWidth: 150 }} aria-label="Name DE" />
                    <input className="f" name="nameEn" defaultValue={c.nameEn} style={{ maxWidth: 150 }} aria-label="Name EN" />
                    <button className="btn ghost sm" type="submit">Umbenennen</button>
                  </form>
                </td>
                <td className="meta">{c.count} {usageLabel}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <form action={deleteCategory} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="kind" value={kind} />
                    <ConfirmButton confirmText={`Kategorie „${c.nameDe}" löschen?`}>Löschen</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={createCategory} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input type="hidden" name="kind" value={kind} />
        <input className="f" name="name" placeholder="Neue Kategorie" style={{ maxWidth: 220 }} />
        <button className="btn ghost sm" type="submit">+ Anlegen</button>
      </form>
    </div>
  );
}

export default async function StrukturPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let dossierCats: Cat[] = [];
  let certCats: Cat[] = [];
  let tagRows: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  let redirects: { id: string; locale: string; fromSlug: string; toSlug: string; entity: string; createdAt: Date }[] = [];
  let dbError = false;
  try {
    const [dcats, ccats, trows, rrows] = await Promise.all([
      db.taxonomy.findMany({ where: { kind: "DOSSIER" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { dossierMulti: true } } } }),
      db.taxonomy.findMany({ where: { kind: "CERTIFICATION" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { certMulti: true } } } }),
      db.tag.findMany({ orderBy: { nameDe: "asc" }, include: { _count: { select: { posts: true } } } }),
      db.redirect.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    dossierCats = dcats.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.dossierMulti }));
    certCats = ccats.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.certMulti }));
    tagRows = trows.map((t) => ({ id: t.id, nameDe: t.nameDe, nameEn: t.nameEn, count: t._count.posts }));
    redirects = rrows;
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1>Struktur</h1>
      <p className="muted">Kategorien, Schlagworte und Weiterleitungen: die Ordnung hinter den Inhalten.</p>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <p className="eyebrow" style={{ marginTop: 24 }}>Kategorien</p>
      <div className="grid g2">
        <CategoryCard title="Dossier-Kategorien" kind="DOSSIER" cats={dossierCats} usageLabel="Dossiers" />
        <CategoryCard title="Zertifizierungs-Kategorien" kind="CERTIFICATION" cats={certCats} usageLabel="Einträge" />
      </div>
      <p className="meta" style={{ marginTop: 8 }}>Briefing-Kategorien pflegst du direkt unter „Briefings“.</p>

      <p className="eyebrow" style={{ marginTop: 28 }}>Schlagworte</p>
      <div className="card bracket">
        {tagRows.length === 0 ? (
          <p className="muted">Noch keine Schlagworte. Sie entstehen auch automatisch beim Verschlagworten von Beiträgen.</p>
        ) : (
          <table>
            <tbody>
              {tagRows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <form action={renameTag} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <input className="f" name="nameDe" defaultValue={t.nameDe} style={{ maxWidth: 150 }} aria-label="Schlagwort DE" />
                      <input className="f" name="nameEn" defaultValue={t.nameEn} style={{ maxWidth: 150 }} aria-label="Schlagwort EN" />
                      <button className="btn ghost sm" type="submit">Umbenennen</button>
                    </form>
                  </td>
                  <td className="meta">{t.count} Beiträge</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={deleteTag} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmButton confirmText={`Schlagwort „${t.nameDe}" löschen? Es wird von allen Beiträgen entfernt.`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={createTag} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input className="f" name="nameDe" placeholder="Schlagwort (DE)" style={{ maxWidth: 180 }} />
          <input className="f" name="nameEn" placeholder="Schlagwort (EN)" style={{ maxWidth: 180 }} />
          <button className="btn ghost sm" type="submit">+ Schlagwort</button>
        </form>
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Weiterleitungen</p>
      <div className="card bracket">
        <p className="meta">Alte Adresse → neue Adresse, falls sich ein Link einmal ändert. Ohne führenden Schrägstrich (z. B. <code>agenten-in-produktion</code>).</p>
        {redirects.length > 0 ? (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Sprache</th><th>Von</th><th>Nach</th><th>Typ</th><th>Angelegt</th><th></th></tr>
            </thead>
            <tbody>
              {redirects.map((r) => (
                <tr key={r.id}>
                  <td className="meta">{r.locale.toUpperCase()}</td>
                  <td className="mono">{r.fromSlug}</td>
                  <td className="mono">{r.toSlug}</td>
                  <td className="meta">{r.entity}</td>
                  <td className="meta">{formatDate(r.createdAt, "de")}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteRedirect} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton confirmText="Weiterleitung löschen?">Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <form action={createRedirect} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <span>
            <label className="f">Sprache</label>
            <select className="f" name="locale" style={{ maxWidth: 90 }}>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
          </span>
          <span>
            <label className="f">Von (alt)</label>
            <input className="f" name="fromSlug" placeholder="alter-slug" style={{ maxWidth: 180 }} />
          </span>
          <span>
            <label className="f">Nach (neu)</label>
            <input className="f" name="toSlug" placeholder="neuer-slug" style={{ maxWidth: 180 }} />
          </span>
          <span>
            <label className="f">Typ</label>
            <select className="f" name="entity" style={{ maxWidth: 130 }}>
              <option value="post">Beitrag</option>
              <option value="dossier">Dossier</option>
              <option value="mission">Einsatz</option>
            </select>
          </span>
          <button className="btn ghost sm" type="submit">+ Weiterleitung</button>
        </form>
      </div>
    </section>
  );
}
