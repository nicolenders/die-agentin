// LinkedIn-Anbindung (SPEC §7.1). „Share on LinkedIn" mit Scope
// `w_member_social` erlaubt das Posten im Namen des authentifizierten
// Mitglieds. Ausgehende Aufrufe gehen ausschließlich an LinkedIn (Allow-List,
// SPEC §13).
//
// Ohne echte LinkedIn-App/Credentials ist der Versand nicht praktisch
// verifizierbar; die Struktur ist vollständig (offener Punkt in
// docs/decisions/0006-channels-secrets.md).

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const SCOPES = "openid profile w_member_social";
const LINKEDIN_VERSION = "202405";

export function authorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  expiresAt: Date;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`LinkedIn-Token-Austausch fehlgeschlagen (${res.status}).`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/** Holt die Member-URN (author) über den OpenID-userinfo-Endpunkt. */
export async function getMemberUrn(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`LinkedIn-userinfo fehlgeschlagen (${res.status}).`);
  const data = (await res.json()) as { sub: string };
  return `urn:li:person:${data.sub}`;
}

export interface ShareInput {
  text: string;
  url?: string;
}

/** Postet einen Beitrag in den Feed des Mitglieds. Gibt die Remote-URL zurück. */
export async function postShare(
  accessToken: string,
  authorUrn: string,
  input: ShareInput,
): Promise<string> {
  const commentary = input.url ? `${input.text}\n\n${input.url}` : input.text;
  const payload = {
    author: authorUrn,
    commentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LinkedIn-Post fehlgeschlagen (${res.status}): ${detail.slice(0, 200)}`);
  }
  const postId = res.headers.get("x-restli-id") ?? "";
  return postId ? `https://www.linkedin.com/feed/update/${postId}` : "https://www.linkedin.com/feed/";
}
