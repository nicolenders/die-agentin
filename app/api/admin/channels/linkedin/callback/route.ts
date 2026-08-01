import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/guard";
import { exchangeCode } from "@/lib/channels/linkedin";
import { setSecret } from "@/lib/secrets";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TOKEN_REF = "linkedin-access-token";

// OAuth-Callback (SPEC §7.1): Code gegen Token tauschen, Token verschlüsselt im
// Secret-Store ablegen, in der DB nur Referenz + Ablauf speichern.
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("li_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${SITE}/admin/kanaele?error=oauth-state`);
  }
  store.delete("li_oauth_state");

  try {
    const redirectUri = `${SITE}/api/admin/channels/linkedin/callback`;
    const { accessToken, expiresAt } = await exchangeCode(code, redirectUri);
    await setSecret(TOKEN_REF, accessToken);

    await db.channelAccount.upsert({
      where: { platform: "LINKEDIN" },
      create: {
        platform: "LINKEDIN",
        displayName: "Persönliches Profil",
        connected: true,
        tokenRef: TOKEN_REF,
        expiresAt,
        lastError: null,
      },
      update: { connected: true, tokenRef: TOKEN_REF, expiresAt, lastError: null },
    });

    return NextResponse.redirect(`${SITE}/admin/kanaele?connected=linkedin`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verbindung fehlgeschlagen.";
    return NextResponse.redirect(
      `${SITE}/admin/kanaele?error=${encodeURIComponent(message)}`,
    );
  }
}
