import { signOutAction } from "./actions";

// Wird von forbidden() gerendert (HTTP 403), wenn ein angemeldeter Nutzer nicht
// in der Allow-List steht (SPEC §9).
export default function Forbidden() {
  return (
    <div className="forbidden">
      <div className="card bracket" style={{ maxWidth: 460 }}>
        <p className="eyebrow">403 · Kein Zugriff</p>
        <h1 style={{ fontSize: 26 }}>Diese Zentrale ist nicht für dich.</h1>
        <p className="muted">
          Dein Konto ist angemeldet, steht aber nicht auf der Zugriffsliste. Der
          Zugang ist auf genau eine Person beschränkt. Es wird kein Konto
          angelegt.
        </p>
        <form action={signOutAction}>
          <button className="btn ghost sm" type="submit" style={{ marginTop: 12 }}>
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
