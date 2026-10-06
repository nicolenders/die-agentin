import { forbidden, notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import { getDispatchPreview } from "@/lib/queries/dispatches";
import { isLocale, type Locale } from "@/lib/i18n/config";
import DispatchPreview from "@/components/preview/DispatchPreview";

export const dynamic = "force-dynamic";

// Vorschau einer Depesche für die Redaktion (ADR 0033): zeigt den gespeicherten
// Stand im Layout der öffentlichen Seite, egal ob Entwurf, geplant oder live.
// Liegt in der Route Group der Vorschau (eigenes, schlichtes Root-Layout, immer
// noindex) und prüft die Rolle selbst, weil das Admin-Layout hier nicht greift.
export default async function AdminDispatchPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/anmelden");
  if (!user.isAdmin) forbidden();

  const { id } = await params;
  const { lang } = await searchParams;
  const locale: Locale = isLocale(lang) ? lang : "de";

  const d = await getDispatchPreview(id, locale);
  if (!d) notFound();

  return (
    <DispatchPreview
      d={d}
      locale={locale}
      basePath={`/preview/depesche/${encodeURIComponent(id)}`}
      editHref={`/admin/depeschen/bearbeiten?id=${encodeURIComponent(id)}`}
    />
  );
}
