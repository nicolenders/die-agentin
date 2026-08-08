# LinkedIn automatisch verbinden (optional)

Die Website kann Beiträge **automatisch auf LinkedIn** posten. Dafür braucht sie
eine LinkedIn-App und zwei Zugangsdaten. X, Instagram und Facebook laufen
bewusst **nicht** automatisch, sondern über die Ein-Klick-Freigabe (Teilen-
Dialog) — dort gibt es nichts einzurichten.

## Voraussetzung

Eine **LinkedIn-Seite** (Unternehmens-/Personenmarke-Seite) — LinkedIn verlangt
sie als Eigentümerin der App.

## Schritt 1 — LinkedIn-App anlegen

1. <https://www.linkedin.com/developers/apps> → **Create app**.
2. Als **App owner** deine LinkedIn-Seite wählen.
3. Reiter **Products** → **„Share on LinkedIn"** und **„Sign In with LinkedIn using OpenID Connect"** anfordern.
4. Reiter **Auth**:
   - **Authorized redirect URL** exakt eintragen:
     `https://nicolenders-prod-web.wittybush-b6a6f63e.westeurope.azurecontainerapps.io/api/admin/channels/linkedin/callback`
   - **Client ID** und **Client Secret** notieren.

## Schritt 2 — Zugangsdaten hinterlegen

Wie bei den anderen Secrets: in GitHub → Repo → **Settings → Secrets and
variables → Actions** zwei neue Secrets anlegen:

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

Danach kurz Bescheid geben — die beiden Werte werden dann (wie `AUTH_*`) beim
Deployment automatisch in die App gesetzt. Ab dann funktioniert unter
**„Zeitplan & Kanäle" → LinkedIn → Verbinden** der OAuth-Login.

## Schritt 3 — Verbinden

Admin → **Zeitplan & Kanäle** → bei LinkedIn **„Verbinden"** → LinkedIn-Login →
zurück zur Seite. Der Status wechselt auf **Verbunden**. Läuft der Zugriff ab,
warnt die Seite 14 Tage vorher; dann einfach **„Neu autorisieren"**.
