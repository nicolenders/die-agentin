# Deployment nach Azure — Schritt für Schritt

Diese Anleitung bringt die Website mit **einer Azure-DevOps-Pipeline** live.
Sie ist für Einsteiger geschrieben: alle Befehle sind zum Kopieren. Wenn du sie
der Reihe nach abarbeitest, läuft die Pipeline beim ersten Start durch.

Zeitbedarf: ~30 Minuten. Voraussetzung: eine Azure-Subscription und ein
Azure-DevOps-Projekt (beides kostenlos anlegbar).

> **Kein Azure DevOps / keine Pipeline?** Drei Wege führen zum Ziel:
> - **Azure Portal (klicken)** → **[PORTAL.md](./PORTAL.md)** — Vorlage
>   `infra/main.json` per Formular ausrollen.
> - **Terminal (az-Befehle) ohne Cloud Shell** → **[MANUELL.md](./MANUELL.md)**.
> - **Automatisiert** → die Pipeline unten in diesem Dokument.

> Nichts davon wurde in dieser Umsetzung real ausgeführt (kein Azure-Zugang).
> Prüfe den Bicep-Plan vor dem ersten Deployment mit `what-if` (Schritt 6).

> **Was tatsächlich läuft:** Das produktive Deployment erfolgt über GitHub
> Actions, nicht über die Pipeline in diesem Dokument — siehe
> `.github/workflows/nicolenders-prod-web-AutoDeployTrigger-*.yml`. Der
> Workflow baut das Image, rollt es auf die Container App aus und setzt die
> Umgebungsvariablen bei jedem Push auf `main` neu. Diese Anleitung beschreibt
> den Aufbau der Infrastruktur; die laufende Konfiguration steht im Workflow.

---

## Überblick: was passiert

Die Pipeline (`azure-pipelines.yml`) macht auf `main` automatisch:

1. Ressourcengruppe und Container Registry anlegen (idempotent)
2. das Container-Image **in der Registry** bauen (kein Docker nötig)
3. die gesamte Infrastruktur per Bicep ausrollen (`infra/main.bicep`)
4. die Datenbankmigration ausführen
5. die fertige Website-URL ausgeben

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

## Schritt 4 — Service Connection in Azure DevOps

Damit die Pipeline nach Azure darf — **ohne Passwörter** (Workload Identity
Federation):

1. Azure DevOps → Project Settings → **Service connections** → New →
   **Azure Resource Manager** → **Workload Identity federation (automatic)**.
2. Subscription wählen, Ressourcengruppe leer lassen (ganze Subscription).
3. Name exakt: **`nicolenders-azure`**.
4. Nach dem Anlegen unter „Manage service principal" der Identität die Rolle
   **Contributor** auf der Subscription (oder der Ressourcengruppe) geben, falls
   nicht automatisch geschehen.

## Schritt 5 — Variablengruppe in Azure DevOps

Azure DevOps → Pipelines → **Library** → **+ Variable group** → Name exakt
**`nicolenders`**. Diese Variablen anlegen (die drei Passwörter mit dem
**Schloss-Symbol** als *secret* markieren):

| Variable | Beispiel / Wert | Secret? |
|---|---|---|
| `resourceGroupName` | `nicolenders-rg` | nein |
| `location` | `germanywestcentral` | nein |
| `acrName` | `nicolendersacr` | nein |
| `sqlAdminPassword` | *(aus Schritt 3)* | **ja** |
| `authSecret` | *(aus Schritt 3)* | **ja** |
| `jobSharedSecret` | *(aus Schritt 3)* | **ja** |
| `adminObjectIds` | *(deine Object ID)* | nein |
| `siteUrl` | *(leer lassen — nach 1. Lauf setzen)* | nein |
| `publicSiteHost` | *(leer lassen — erst mit eigener Domain setzen)* | nein |
| `entraClientId` | *(leer oder später)* | nein |
| `entraClientSecret` | *(leer oder später)* | **ja** |
| `entraIssuer` | *(leer oder später)* | nein |
| `linkedinClientId` | *(leer oder später)* | nein |
| `linkedinClientSecret` | *(leer oder später)* | **ja** |
| `budgetContactEmail` | *(leer oder deine E-Mail)* | nein |

> Leere optionale Werte sind in Ordnung — trage in Azure DevOps einfach ein
> Leerzeichen ein, wenn die Oberfläche einen leeren Wert nicht speichert.

## Schritt 6 — (Empfohlen) Plan prüfen

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

## Schritt 7 — Pipeline anlegen und starten

1. Azure DevOps → Pipelines → **New pipeline** → GitHub → dein Repo →
   **Existing Azure Pipelines YAML file** → `/azure-pipelines.yml`.
2. **Run**. Beim ersten Lauf legt Azure DevOps automatisch das Environment
   `nicolenders-prod` an.
3. Am Ende steht in den Logs die **Website-URL**
   (`https://nicolenders-prod-web.<region>.azurecontainerapps.io`).

## Schritt 8 — `siteUrl` nachtragen (einmalig)

Setze in der Variablengruppe `nicolenders` die Variable `siteUrl` auf die
ausgegebene URL und starte die Pipeline erneut. Ab jetzt stimmen Feeds, Sitemap
und OAuth-Redirects.

**Fertig.** Jeder weitere Push auf `main` deployt automatisch.

---

## Optional: Anmeldung (Entra ID) aktivieren

Damit du dich im Admin anmelden kannst:

1. Entra-App registrieren (Azure Portal → Entra ID → App registrations → New).
   Redirect-URI (Web): `https://<deine-webUrl>/api/auth/callback/microsoft-entra-id`.
2. Client-ID, ein Client-Secret und den Issuer
   (`https://login.microsoftonline.com/<tenant-id>/v2.0`) notieren.
3. In die Variablengruppe eintragen: `entraClientId`, `entraClientSecret`,
   `entraIssuer`. Pipeline erneut starten.

## Optional: LinkedIn-Automatik

`linkedinClientId` / `linkedinClientSecret` aus deiner LinkedIn-App in die
Variablengruppe eintragen (SPEC §19.3: eine LinkedIn-Seite als App-Eigentümerin
wird benötigt). Danach im Admin unter „Kanäle" verbinden.

## Optional: eigene Domain

Bewusst nicht in der Pipeline, weil dafür eine DNS-Validierung nötig ist:

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

**Über die Azure-DevOps-Pipeline:** dieselben Werte als `siteUrl` und
`publicSiteHost` in der Variablengruppe `nicolenders`.

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

Alternativ die mitgelieferte Pipeline `pipelines/rollback.yml` als zweite
Pipeline anlegen und mit dem Revisionsnamen manuell starten.

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
  deutlich einfacher einzurichten. Das Passwort liegt nur in der Variablengruppe
  bzw. als Container-App-Secret, nie im Repo. Umstieg auf Managed Identity ist
  ein späterer, abgegrenzter Schritt.
- **Container Registry per CLI vorab** (statt im Template): löst die
  Henne-Ei-Situation „Image bauen vor Registry".
- **Custom Domain optional** (siehe oben), damit der erste Lauf ohne DNS
  durchläuft.
- `npm audit` blockt die Pipeline nicht (nur Hinweis), damit ein neuer Advisory
  in einer Transitiv-Abhängigkeit das Deployment nicht unerwartet stoppt.
