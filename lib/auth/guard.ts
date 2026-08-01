import { auth } from "@/auth";

// Serverseitige Rollenprüfung (SPEC §9). Sichtbarkeit von UI-Elementen ist
// KEINE Autorisierung — jede Schreiboperation (Server Action) ruft
// `requireAdmin()` als erste Zeile auf.

export interface SessionUser {
  oid?: string;
  isAdmin: boolean;
  name?: string | null;
  email?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/** Signalisiert fehlende Berechtigung; von Server Actions in eine 403-Antwort
 *  bzw. Fehlermeldung übersetzt. */
export class ForbiddenError extends Error {
  constructor(message = "Kein Zugriff. Diese Aktion erfordert die Rolle Admin.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Wirft `ForbiddenError`, wenn kein angemeldeter Admin vorliegt. Gibt sonst den
 * Session-Nutzer zurück. Erste Zeile jeder schreibenden Server Action.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) {
    throw new ForbiddenError();
  }
  return user;
}
