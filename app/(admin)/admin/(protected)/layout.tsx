import { redirect, forbidden } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import AdminSidebar from "@/components/admin/AdminSidebar";
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
      <AdminSidebar />
      <main className="adminMain">
        <div className="topbar">
          <strong className="crumb">ZENTRALE</strong>
          <span className="st live">Angemeldet via Entra ID</span>
          <a
            className="btn ghost sm"
            href="/de"
            style={{ marginLeft: "auto" }}
            target="_blank"
            rel="noopener"
          >
            Website ansehen ↗
          </a>
          <form action={signOutAction}>
            <button className="btn ghost sm" type="submit">
              Abmelden
            </button>
          </form>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
