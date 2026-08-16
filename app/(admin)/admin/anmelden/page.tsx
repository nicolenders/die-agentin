import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import BrandMark from "@/components/BrandMark";
import { signInAction, signOutAction } from "../actions";

export const metadata = { title: "Anmelden · Zentrale" };

// Anmeldeseite. Ausschließlich Microsoft Entra ID (SPEC §9). Keine Passwörter,
// keine Registrierung. Bereits angemeldete Admins werden weitergeleitet.
export default async function SignInPage() {
  const user = await getSessionUser();
  if (user?.isAdmin) redirect("/admin");

  return (
    <div className="signinShell">
      <div className="card bracket signinCard">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <BrandMark size={40} className="sigil" />
          <span>
            <b style={{ fontFamily: "var(--display)", letterSpacing: ".13em" }}>
              DIE AGENTIN
            </b>
            <br />
            <small className="meta">ZENTRALE</small>
          </span>
        </div>

        <h1 style={{ fontSize: 24, marginTop: 18 }}>Anmelden</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          Zugang ausschließlich über Microsoft Entra ID mit MFA. Es gibt keine
          Passwörter in der Anwendung und keine öffentliche Registrierung.
        </p>

        {user && !user.isAdmin ? (
          <p className="st err" style={{ display: "inline-block", marginBottom: 12 }}>
            Angemeldet, aber ohne Zugriff. Anderes Konto verwenden?
          </p>
        ) : null}

        <form action={signInAction}>
          <button className="btn solid" type="submit" style={{ width: "100%", justifyContent: "center" }}>
            Mit Microsoft Entra ID anmelden
          </button>
        </form>

        {user && !user.isAdmin ? (
          <form action={signOutAction}>
            <button className="btn ghost sm" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              Abmelden
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
