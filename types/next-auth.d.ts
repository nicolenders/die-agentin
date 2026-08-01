import type { DefaultSession } from "next-auth";

// Erweitert die Session um die Entra Object ID und das Admin-Flag.
declare module "next-auth" {
  interface Session {
    user: {
      oid?: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oid?: string;
    isAdmin?: boolean;
  }
}
