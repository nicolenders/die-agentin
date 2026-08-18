# Infrastruktur nach Azure — Schritt für Schritt

Diese Anleitung baut die **Infrastruktur** auf: Ressourcengruppe, Container
Registry, Container App, SQL-Datenbank, Blob-Speicher, Key Vault. Alle Befehle
sind zum Kopieren.

Zeitbedarf: ~30 Minuten. Voraussetzung: eine Azure-Subscription.

> **Das laufende Deployment steht nicht hier.** Gebaut und ausgerollt wird über
> GitHub Actions:
> `.github/workflows/nicolenders-prod-web-AutoDeployTrigger-*.yml` baut bei
> jedem Push auf `main` das Image, rollt es auf die Container App aus und setzt
> die Umgebungsvariablen neu. Diese Anleitung ist der **Erstaufbau**; danach
> übernimmt der Workflow. Begründung: `docs/decisions/0015-deployment-github-actions.md`.

> **Drei Wege für den Erstaufbau:**
> - **Azure Portal (klicken)** → **[PORTAL.md](./PORTAL.md)** — Vorlage
>   `infra/main.json` per Formular ausrollen.
> - **Terminal (az-Befehle)** → **[MANUELL.md](./MANUELL.md)**.
> - **Bicep direkt** → dieses Dokument.

> Nichts davon wurde in dieser Umsetzung real ausgeführt (kein Azure-Zugang).
> Prüfe den Bicep-Plan vor dem ersten Deployment mit `what-if` (Schritt 5).

---

## Überblick: was passiert

Einmalig beim Erstaufbau:

1. Ressourcengruppe und Container Registry anlegen (idempotent)
2. Secrets erzeugen
3. die gesamte Infrastruktur per Bicep ausrollen (`infra/main.bicep`)
4. die GitHub-Actions-Secrets hinterlegen, damit der Deploy-Workflow arbeiten kann

Danach bei jedem Push auf `main`, durch den Workflow:

1. Container-Image bauen und in die Registry laden
2. neue Revision der Container App ausrollen
3. Umgebungsvariablen und Container-App-Secrets neu setzen
4. Datenbankmigration beim Start des Containers (`instrumentation.ts`)

Alle Azure-Ressourcen: siehe unten „Was angelegt wird".

---

## Schritt 1 — Werkzeuge (einmalig, lokal)

```bash
# Azure CLI installieren: https://learn.microsoft.com/cli/azure/install-azure-cli
az login
az account set --subscription "<deine-Subscription-ID>"
```

## Schritt 2 — Namen festlegen

Du brauchst zwei **global eindeutige** Namen (nur Kleinbuchstaben/Ziffern):

| Zweck | Beispiel | Regel |
|---|---|---|
| Container Registry (`acrName`) | `nicolendersacr` | 5–50 Zeichen, a–z 0–9 |
| Ressourcengruppe | `nicolenders-rg` | frei wählbar |

Prüfen, ob der Registry-Name frei ist:

```bash
az acr check-name --name nicolendersacr --query nameAvailable
```

## Schritt 3 — Secrets erzeugen

```bash
# Auth.js-Secret
npx auth secret            # kopiere die Ausgabe → authSecret

# Shared Secret für den Scheduler-Job
openssl rand -hex 32       # → jobSharedSecret

# SQL-Admin-Passwort (mind. 12 Zeichen, KEIN Semikolon)
openssl rand -base64 24 | tr -d '/+=;'   # → sqlAdminPassword
```

Deine **Entra Object ID** (damit du dich im Admin anmelden darfst):

```bash
az ad signed-in-user show --query id -o tsv    # → adminObjectIds
```

> Der **Login** im Admin läuft über Microsoft Entra ID. Für den ersten Start
> genügt es, `adminObjectIds` zu setzen — die Entra-App-Registrierung
> (`entraClientId` etc.) kannst du später nachtragen. Die öffentliche Website
> funktioniert sofort, auch ohne Entra-App.

## Schritt 4 — Zugang für GitHub Actions

Der Deploy-Workflow meldet sich per **OIDC** an Azure an, ohne gespeichertes
Passwort. Die drei Kennungen dafür stehen als Repository-Secrets.

Ist die Container App über das Azure Portal → **Deployment Center** mit dem
Repository verbunden worden, hat Azure die Secrets bereits angelegt. Sonst von
Hand: Repo → Settings → Secrets and variables → **Actions** → **Secrets**.

| Secret | Inhalt |
|---|---|
| `NICOLENDERSPRODWEB_AZURE_CLIENT_ID` | Client-ID der App-Registrierung mit Federated Credential auf dieses Repo |
| `NICOLENDERSPRODWEB_AZURE_TENANT_ID` | Tenant-ID |
| `NICOLENDERSPRODWEB_AZURE_SUBSCRIPTION_ID` | Subscription-ID |
| `NICOLENDERSPRODWEB_REGISTRY_USERNAME` | Registry-Benutzer (ACR → Access keys) |
| `NICOLENDERSPRODWEB_REGISTRY_PASSWORD` | Registry-Passwort |

Die Identität braucht **Contributor** auf der Ressourcengruppe.

## Schritt 5 — Anwendungs-Konfiguration in GitHub

Der Workflow schreibt die Umgebungsvariablen der Container App bei **jedem**
Lauf neu. Damit kann keine im Portal von Hand gesetzte Variable unbemerkt
verschwinden — sie muss aber hier stehen.

**Secrets** (Repo → Settings → Secrets and variables → Actions → Secrets):

| Secret | Inhalt |
|---|---|
| `AUTH_SECRET` | *(aus Schritt 3)* |
| `ADMIN_OBJECT_IDS` | deine Entra Object ID, kommasepariert |
| `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_SECRET` | Anmeldung, siehe unten |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | LinkedIn-Automatik, siehe unten |

**Variables** (derselbe Ort, Reiter **Variables** — keine Geheimnisse):

| Variable | Wert | Wirkung |
|---|---|---|
| `SITE_URL` | `https://nicolenders.com` | Feeds, Sitemap, `AUTH_URL` |
| `PUBLIC_SITE_HOST` | `nicolenders.com` (ohne Schema) | canonical, hreflang, og:image, noindex-Entscheidung |

Beide dürfen zunächst fehlen: dann greifen die Vorgabewerte im Workflow, also
die Container-App-URL. Zum Umzug auf die eigene Domain siehe unten.

`DATABASE_URL`, `BLOB_*` und `JOB_SHARED_SECRET` verwaltet die Infrastruktur
(Bicep bzw. Container-App-Secrets); der Workflow fasst sie nicht an.

## Schritt 6 — (Empfohlen) Bicep-Plan prüfen

Bevor du echt deployst, einmal den Bicep-Plan ansehen. Dafür muss die Registry
schon existieren, weil das Template sie referenziert:

```bash
az group create -n nicolenders-rg -l germanywestcentral
az acr create -n nicolendersacr -g nicolenders-rg --sku Basic --admin-enabled false

az deployment group what-if -g nicolenders-rg \
  --template-file infra/main.bicep \
  --parameters acrName=nicolendersacr containerImage=nicolendersacr.azurecr.io/web:preview \
    sqlAdminPassword='<pwd>' authSecret='<secret>' jobSharedSecret='<secret>' \
    adminObjectIds='<object-id>'
```

## Schritt 7 — Infrastruktur ausrollen

```bash
az deployment group create -g nicolenders-rg \
  --template-file infra/main.bicep \
  --parameters acrName=nicolendersacr \
    containerImage=nicolendersacr.azurecr.io/nicolenders-prod-web:bootstrap \
    sqlAdminPassword='<pwd>' authSecret='<secret>' jobSharedSecret='<secret>' \
    adminObjectIds='<object-id>'
```

Am Ende steht in der Ausgabe die **Website-URL**
(`https://nicolenders-prod-web.<region>.azurecontainerapps.io`).

Das Image `:bootstrap` muss vorher einmal in der Registry liegen — dafür gibt es
den Workflow **„Build & push image"** (Actions → Run workflow) oder
`az acr build -r nicolendersacr -t nicolenders-prod-web:bootstrap .`

## Schritt 8 — Ersten Deploy auslösen

Actions → **„Trigger auto deployment for nicolenders-prod-web"** → Run workflow.
Ab jetzt deployt jeder Push auf `main` automatisch.

Trage danach `SITE_URL` unter Variables auf die ausgegebene URL ein (Schritt 5),
sonst zeigen Feeds, Sitemap und die Anmelde-Weiterleitung ins Leere.

**Fertig.**

---

## Optional: Anmeldung (Entra ID) aktivieren

Damit du dich im Admin anmelden kannst:

1. Entra-App registrieren (Azure Portal → Entra ID → App registrations → New).
   Redirect-URI (Web): `https://<deine-webUrl>/api/auth/callback/microsoft-entra-id`.
2. Client-ID, ein Client-Secret und den Issuer
   (`https://login.microsoftonline.com/<tenant-id>/v2.0`) notieren.
3. `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID` und `ENTRA_CLIENT_SECRET` als
   GitHub-Secrets hinterlegen (Schritt 5) und den Deploy-Workflow erneut
   starten.

## Optional: LinkedIn-Automatik

`LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` aus deiner LinkedIn-App als
GitHub-Secrets hinterlegen (SPEC §19.3: eine LinkedIn-Seite als App-Eigentümerin
wird benötigt) und den Deploy-Workflow erneut starten. Danach im Admin unter
„Kanäle" verbinden.

## Optional: eigene Domain

Bewusst nicht automatisiert, weil dafür eine DNS-Validierung nötig ist:

```bash
# 1. CNAME/TXT laut Ausgabe des ersten Befehls beim DNS-Anbieter setzen
az containerapp hostname add   -n nicolenders-prod-web -g nicolenders-rg --hostname www.deine-domain.de
# 2. Kostenloses Managed Certificate binden
az containerapp hostname bind  -n nicolenders-prod-web -g nicolenders-rg \
  --hostname www.deine-domain.de --environment nicolenders-prod-env --validation-method CNAME
```
Danach **beide** Werte umstellen und neu deployen.

**Über GitHub Actions (der laufende Weg):** Repo → Settings → Secrets and
variables → Actions → Reiter **Variables**:

| Variable | Wert | Wirkung |
|---|---|---|
| `SITE_URL` | `https://deine-domain.de` | Feeds, Sitemap, `AUTH_URL` |
| `PUBLIC_SITE_HOST` | `deine-domain.de` (ohne Schema) | canonical, hreflang, og:image — und die noindex-Entscheidung |

Danach den Workflow „Trigger auto deployment for nicolenders-prod-web" starten
(Actions → Run workflow) oder auf `main` pushen.

**Beim Erstaufbau über Bicep:** dieselben Werte als Parameter `siteUrl` und
`publicSiteHost`.

**Reihenfolge beachten:** den kanonischen Host erst setzen, wenn die Domain
wirklich gebunden ist. `proxy.ts` schickt jeden anderen Host mit
`X-Robots-Tag: noindex, nofollow` weg — steht dort eine Domain, die noch nicht
auf die Container App zeigt, ist gar nichts mehr indexierbar.

Solange der kanonische Host leer ist, leitet die App ihn aus der Site-URL ab.
Das funktioniert, macht aber die Container-App-URL zum kanonischen Host,
solange die Site-URL darauf zeigt — dann stehen `azurecontainerapps.io`-Adressen
in `canonical`, `hreflang` und `og:image`.

**Nicht vergessen:** `AUTH_URL` wandert mit der Site-URL mit. Die neue
Redirect-URI (`https://deine-domain.de/api/auth/callback/microsoft-entra-id`)
muss in der Entra-App-Registrierung hinterlegt sein, sonst schlägt die
Anmeldung nach dem Umzug fehl.

## Rollback

Ein Rollback ist ein **Traffic-Switch** auf eine ältere Revision (kein Redeploy):

```bash
az containerapp revision list -n nicolenders-prod-web -g nicolenders-rg \
  --query "[].{name:name,created:properties.createdTime,active:properties.active}" -o table
az containerapp ingress traffic set -n nicolenders-prod-web -g nicolenders-rg \
  --revision-weight <alte-revision>=100
```

Bequemer: Actions → **„Rollback (Traffic auf eine ältere Revision)"** →
Run workflow, Revisionsname eintragen. Der Workflow listet die vorhandenen
Revisionen vorher auf und prüft, ob es die gewählte gibt.

---

## Was angelegt wird (`infra/main.bicep`)

| Ressource | Zweck | Kosten (ca.) |
|---|---|---|
| Container Registry (Basic) | Image-Ablage | ~5 €/Monat |
| Managed Identity | ACR-Pull, Blob-Zugriff | 0 € |
| Log Analytics (Cap 1 GB) | Logs | im Frei-Kontingent |
| Storage (media/uploads) | Bilder | < 1 €/Monat |
| Azure SQL (Free, serverless) | Datenbank, `AutoPause` | 0 € |
| Container Apps Environment | Laufzeitumgebung | kostenfrei |
| Container App `web` | die Anwendung (min 1/max 3) | ~4–8 €/Monat |
| Container Apps Job `scheduler` | Cron alle 5 Min. (`job-once.mjs`) | im Frei-Kontingent |
| Budget-Alarm (optional) | Kostenbremse | 0 € |

**Erwartete Gesamtkosten: ~10–15 €/Monat** (SPEC §14).

## Bewusste Vereinfachungen (ggü. SPEC §13/§14)

- **SQL-Authentifizierung** statt Managed Identity gegen SQL (ADR 0002, Fallback):
  deutlich einfacher einzurichten. Das Passwort liegt nur als GitHub-Secret
  bzw. als Container-App-Secret, nie im Repo. Umstieg auf Managed Identity ist
  ein späterer, abgegrenzter Schritt.
- **Container Registry per CLI vorab** (statt im Template): löst die
  Henne-Ei-Situation „Image bauen vor Registry".
- **Custom Domain optional** (siehe oben), damit der erste Lauf ohne DNS
  durchläuft.
- `npm audit` blockt das CI-Gate nicht (nur Hinweis), damit ein neuer Advisory
  in einer Transitiv-Abhängigkeit das Deployment nicht unerwartet stoppt.
