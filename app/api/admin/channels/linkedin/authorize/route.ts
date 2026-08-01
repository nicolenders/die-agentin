import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/guard";
import { authorizeUrl } from "@/lib/channels/linkedin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Startet den LinkedIn-OAuth-Fluss (SPEC §7.1). Nur Admin.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  if (!process.env.LINKEDIN_CLIENT_ID) {
    return NextResponse.redirect(`${SITE}/admin/kanaele?error=linkedin-not-configured`);
  }

  const state = randomUUID();
  const store = await cookies();
  store.set("li_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${SITE}/api/admin/channels/linkedin/callback`;
  return NextResponse.redirect(authorizeUrl(state, redirectUri));
}
