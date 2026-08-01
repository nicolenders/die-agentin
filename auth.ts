import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isAdmin } from "@/lib/auth/allowlist";

// Auth.js v5 (SPEC §9). Provider: Microsoft Entra ID. Session als JWT im
// httpOnly-Cookie (SameSite=Lax, Secure). Keine User-Tabelle, keine
// Registrierung — Autorisierung ausschließlich über die Allow-List von Entra
// Object IDs (`ADMIN_OBJECT_IDS`). MFA wird in Entra erzwungen, nicht hier.
//
// Client-ID/-Secret/-Issuer werden automatisch aus den AUTH_MICROSOFT_ENTRA_ID_*
// Umgebungsvariablen gelesen (Auth.js-Konvention), AUTH_SECRET ebenso.

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MicrosoftEntraID],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, profile }) {
      // Die Object ID steht im id_token als `oid`.
      const profileOid = (profile as { oid?: unknown } | undefined)?.oid;
      const existingOid = typeof token.oid === "string" ? token.oid : undefined;
      const oid = typeof profileOid === "string" ? profileOid : existingOid;
      token.oid = oid;
      token.isAdmin = isAdmin(oid);
      return token;
    },
    async session({ session, token }) {
      session.user.oid = typeof token.oid === "string" ? token.oid : undefined;
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
  pages: {
    // Eigene, minimalistische Anmeldeseite unter /admin.
    signIn: "/admin/anmelden",
  },
});
