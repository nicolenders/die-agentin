# Manuelles Deployment (ohne Pipeline, ohne Cloud Shell)

Die Pipeline führt nur `az`-Befehle aus — die kannst du genauso **selbst in einem
Terminal auf deinem Rechner** ausführen. Kein Docker nötig (das Image wird in
Azure gebaut). Die Cloud Shell brauchst du nicht.

**Voraussetzungen**
- Azure CLI lokal installiert: <https://learn.microsoft.com/cli/azure/install-azure-cli>
- Node.js ≥ 22 und dieses Repo lokal ausgecheckt (nur für die DB-Migration nötig)
- Ein normales Terminal: Windows **PowerShell**, macOS/Linux-Terminal oder WSL

> Tipp: Wenn ein langer Befehl über mehrere Zeilen umbricht, kopiere ihn als
> **eine** Zeile — Zeilenumbrüche sind die häufigste Fehlerquelle.

---

## 0. Anmelden

```bash
az login
az account list -o table                 # zeigt deine Subscriptions
az account set --subscription "<DEINE-SUBSCRIPTION-ID>"
```

## 1. Einmalig: Ressourcen-Anbieter registrieren

Bei einer neuen Subscription müssen diese „Provider" einmal aktiviert werden —
sonst schlägt Schritt 4 mit `MissingSubscriptionRegistration` fehl.

```bash
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.Sql --wait
az provider register --namespace Microsoft.Storage --wait
az provider register --namespace Microsoft.OperationalInsights --wait
```

## 2. Werte festlegen

**PowerShell (Windows):**
```powershell
$RG="nicolenders-rg"
$LOC="germanywestcentral"
$ACR="nicolendersacr"          # global eindeutig, nur a-z 0-9
$TAG="v1"
$SQL_PWD="<starkes-Passwort-min-12-Zeichen-OHNE-Semikolon>"
$AUTH_SECRET="<siehe unten>"
$JOB_SECRET="<siehe unten>"
$ADMIN_OID="<deine Entra Object ID>"
```

**bash (macOS/Linux/WSL):**
```bash
RG=nicolenders-rg
LOC=germanywestcentral
ACR=nicolendersacr
TAG=v1
SQL_PWD='<starkes-Passwort-min-12-Zeichen-OHNE-Semikolon>'
AUTH_SECRET='<siehe unten>'
JOB_SECRET='<siehe unten>'
ADMIN_OID='<deine Entra Object ID>'
```

Werte erzeugen:
```bash
npx auth secret                          # → AUTH_SECRET (und ggf. JOB_SECRET)
az ad signed-in-user show --query id -o tsv   # → ADMIN_OID
```
- **JOB_SECRET:** irgendein langer Zufallsstring. PowerShell: `[guid]::NewGuid().ToString("N")`, bash: `openssl rand -hex 32`.
- **SQL_PWD:** frei wählbar, mind. 12 Zeichen, **kein Semikolon** (bricht die Verbindungszeichenfolge).

## 3. Ressourcengruppe + Container Registry

```bash
az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic --admin-enabled false
```

## 4. Image in Azure bauen (kein Docker nötig)

Im Repo-Ordner ausführen (dort liegt das `Dockerfile`):

```bash
az acr build -r $ACR -t web:$TAG .
```

## 5. Infrastruktur ausrollen (Bicep)

Ein Befehl, eine Zeile (bei Bedarf Werte direkt einsetzen):

```bash
az deployment group create -g $RG -n deploy-$TAG --template-file infra/main.bicep --parameters location=$LOC acrName=$ACR containerImage=$ACR.azurecr.io/web:$TAG sqlAdminPassword=$SQL_PWD authSecret=$AUTH_SECRET jobSharedSecret=$JOB_SECRET adminObjectIds=$ADMIN_OID
```

Ergebnisse (URL und DB-Adresse) auslesen:

```bash
az deployment group show -g $RG -n deploy-$TAG --query properties.outputs.webUrl.value -o tsv
az deployment group show -g $RG -n deploy-$TAG --query properties.outputs.sqlServerFqdn.value -o tsv
```

Merke dir die **webUrl** (z. B. `https://nicolenders-prod-web.<region>.azurecontainerapps.io`)
und die **sqlServerFqdn** (z. B. `nicolenders-prod-sql-abc123.database.windows.net`).

## 6. Datenbank migrieren (einmalig)

Deine aktuelle IP an der SQL-Firewall freigeben, dann migrieren:

**bash:**
```bash
SQL_FQDN=<sqlServerFqdn aus Schritt 5>
SQL_SERVER=${SQL_FQDN%%.*}                        # Teil vor dem ersten Punkt
MYIP=$(curl -s https://api.ipify.org)
az sql server firewall-rule create -g $RG -s $SQL_SERVER -n meine-ip --start-ip-address $MYIP --end-ip-address $MYIP

npm ci
export DATABASE_URL="sqlserver://$SQL_FQDN:1433;database=nicolendersdb;user=nicoleadmin;password=$SQL_PWD;encrypt=true;trustServerCertificate=false"
npm run db:deploy                                 # wendet die Migrationen an
npm run db:seed                                   # optional: Beispieldaten
```

**PowerShell:**
```powershell
$SQL_FQDN="<sqlServerFqdn aus Schritt 5>"
$SQL_SERVER=$SQL_FQDN.Split(".")[0]
$MYIP=(Invoke-RestMethod https://api.ipify.org)
az sql server firewall-rule create -g $RG -s $SQL_SERVER -n meine-ip --start-ip-address $MYIP --end-ip-address $MYIP

npm ci
$env:DATABASE_URL="sqlserver://$SQL_FQDN`:1433;database=nicolendersdb;user=nicoleadmin;password=$SQL_PWD;encrypt=true;trustServerCertificate=false"
npm run db:deploy
npm run db:seed
```

> `nicolendersdb` und `nicoleadmin` sind die Standardwerte aus dem Bicep-Template
> — nur ändern, wenn du sie beim Deployment überschrieben hast.

## 7. Öffentliche URL eintragen (empfohlen)

Damit Feeds, Sitemap und OAuth die richtige Adresse nutzen:

```bash
az containerapp update -n nicolenders-prod-web -g $RG --set-env-vars NEXT_PUBLIC_SITE_URL=<webUrl aus Schritt 5>
```

Sobald eine eigene Domain auf der Container App gebunden ist, zusätzlich den
kanonischen Host setzen — er steuert canonical, hreflang, og:image und die
noindex-Entscheidung:

```bash
az containerapp update -n nicolenders-prod-web -g $RG --set-env-vars PUBLIC_SITE_HOST=deine-domain.de
```

Vorher nicht: Jeder Host, der nicht der kanonische ist, bekommt
`X-Robots-Tag: noindex, nofollow`.

> **Achtung:** Bicep schreibt die Umgebungsvariablen deklarativ. Ein späteres
> `az deployment group create` ohne `publicSiteHost=…` entfernt den hier
> gesetzten Wert wieder. Den Parameter deshalb ab jetzt bei jedem Deployment
> mitgeben (siehe unten).

**Fertig.** Öffne die webUrl im Browser.

---

## Aktualisieren (neue Version ausrollen)

Neuen Tag vergeben und die Schritte 4 → 5 → (6 nur bei neuen Migrationen)
wiederholen:

```bash
TAG=v2
az acr build -r $ACR -t web:$TAG .
az deployment group create -g $RG -n deploy-$TAG --template-file infra/main.bicep --parameters location=$LOC acrName=$ACR containerImage=$ACR.azurecr.io/web:$TAG sqlAdminPassword=$SQL_PWD authSecret=$AUTH_SECRET jobSharedSecret=$JOB_SECRET adminObjectIds=$ADMIN_OID siteUrl=<webUrl> publicSiteHost=<hostname oder leer lassen>
```

## Wenn etwas klemmt

- **`MissingSubscriptionRegistration`** → Schritt 1 (Provider) nachholen.
- **`acrName ... already exists` / nicht verfügbar** → anderen, global eindeutigen
  `ACR`-Namen wählen (nur Kleinbuchstaben/Ziffern).
- **DB-Migration hängt / Timeout** → Firewall-Regel aus Schritt 6 prüfen; die
  Free-DB „schläft" nach Inaktivität und braucht beim ersten Zugriff 30–60 s.
- **App zeigt Fehler beim Start** → Logs ansehen:
  `az containerapp logs show -n nicolenders-prod-web -g $RG --follow`
- **Rollback** → auf eine ältere Revision umschalten:
  `az containerapp revision list -n nicolenders-prod-web -g $RG -o table`, dann
  `az containerapp ingress traffic set -n nicolenders-prod-web -g $RG --revision-weight <alte-revision>=100`

## Ganz ohne CLI (nur Portal)?

Nicht empfehlenswert: Registry, SQL, Storage, Environment, Container App, Job,
Secrets und Rollen einzeln im Portal anzulegen ist mühsam und fehleranfällig.
Du kannst zwar das Bicep-Template im Portal unter **„Benutzerdefinierte
Vorlage bereitstellen" → „Editor" → `main.bicep` einfügen** ausrollen (Schritt 5),
aber der Image-Build (Schritt 4) und die DB-Migration (Schritt 6) brauchen
trotzdem ein Terminal. Der schnellste zuverlässige Weg ist das lokale `az` oben.
