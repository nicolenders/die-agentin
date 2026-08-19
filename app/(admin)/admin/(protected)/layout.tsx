import { redirect, forbidden } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminSearchBox from "@/components/admin/AdminSearchBox";
import DbStatus from "@/components/admin/DbStatus";
import Toaster from "@/components/admin/Toaster";
import { signOutAction } from "../actions";

// Schützt alle echten Admin-Seiten. Nicht angemeldet → Anmeldung; angemeldet,
// aber nicht in der Allow-List → 403 (SPEC §9, M1-Abnahme).
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/anmelden");
  if (!user.isAdmin) forbidden();

  return (
    <div className="app">
      {/* Ohne Sprungmarke muss man sich auf jeder Seite der Zentrale erst durch
          achtzehn Navigationspunkte tabben, bevor der Inhalt erreichbar ist. */}
      <a className="skip-link" href="#admin-content">
        Zum Inhalt springen
      </a>
      <AdminSidebar />
      <div className="adminMain">
        {/* Kopfzeile als eigenes Landmark: sie stand bisher innerhalb von
            <main> und wurde damit auf jeder Seite als Inhalt mitgelesen. */}
        <header className="topbar">
          <strong className="crumb">ZENTRALE</strong>
          <AdminSearchBox />
          <span className="st live topbar-optional">Angemeldet via Entra ID</span>
          <DbStatus />
          <a
            className="btn ghost sm"
            href="/de"
            style={{ marginLeft: "auto" }}
            target="_blank"
            rel="noopener"
          >
            Website ansehen
            {/* Der Pfeil ist Dekoration; ohne aria-hidden liest ein Screenreader
                „Pfeil nach rechts oben" mit. Dass ein neues Fenster aufgeht,
                gehört dagegen angesagt. */}
            <span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> (öffnet in neuem Tab)</span>
          </a>
          <form action={signOutAction}>
            <button className="btn ghost sm" type="submit">
              Abmelden
            </button>
          </form>
        </header>
        <main id="admin-content" className="content" tabIndex={-1}>
          {children}
        </main>
        <Toaster />
      </div>
    </div>
  );
}
