# Deployment über das Azure Portal (Klick-Anleitung)

Fast alles lässt sich im Portal per Oberfläche erledigen. Zwei Dinge brauchen
technisch einen Build- bzw. Migrationsschritt — für beide steht unten der
einfachste Portal-Weg **und** eine Ein-Zeilen-Alternative.

Reihenfolge: **Registry → Image bauen → Vorlage ausrollen → Datenbank
migrieren → URL eintragen.**

---

## 1. Ressourcen-Anbieter aktivieren (einmalig)

Portal → oben nach **„Subscriptions"** suchen → deine Subscription →
links **„Resource providers"** → oben suchen und je **„Register"** klicken für:
`Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.Sql`,
`Microsoft.Storage`, `Microsoft.OperationalInsights`.

(Status wird „Registered". Ohne das bricht Schritt 4 mit
„MissingSubscriptionRegistration" ab.)

## 2. Ressourcengruppe anlegen

Portal → **„Resource groups"** → **„+ Create"** → Name z. B. `nicolenders-rg`,
Region z. B. `Germany West Central` → **Review + create** → **Create**.

## 3. Container Registry anlegen

Portal → **„+ Create a resource"** → nach **„Container Registry"** suchen →
**Create**:
- Ressourcengruppe: `nicolenders-rg`
- Registry name: **global eindeutig**, nur Kleinbuchstaben/Ziffern, z. B.
  `nicolendersacr`
- Region: wie oben · SKU: **Basic**
- **Review + create** → **Create**.

## 4. Container-Image bauen (in Azure, ohne Docker)

**Portal-Weg (ACR-Task aus GitHub):**
1. Portal → deine Registry `nicolendersacr` öffnen.
2. Links unter **„Services"** → **„Tasks"** → **„+ Add task"**.
3. Ausfüllen:
   - Task name: `build-web`
   - Image: `web:latest`
   - Dockerfile: `Dockerfile`
   - **Source location**: GitHub, Repository
     `https://github.com/nicolenders/die-agentin.git`, Branch `main`
   - Ist das Repo privat: einmalig ein **GitHub Personal Access Token**
     hinterlegen (GitHub → Settings → Developer settings → Tokens, Scope `repo`).
   - Commit-Trigger kannst du ausschalten.
4. **Create**, dann bei der Task oben **„Run"** klicken.
5. Nach ~1–2 Min. erscheint das Image unter **„Repositories" → `web`**.

> **Ein-Zeilen-Alternative** (falls der Task hakt), einmal in Cloud Shell oder
> lokalem Terminal, im Repo-Ordner:
> `az acr build -r nicolendersacr -t web:latest .`

## 5. Gesamte Infrastruktur als Vorlage ausrollen

Das legt SQL-Datenbank, Storage, Umgebung, die Container-App und den
Scheduler-Job in einem Rutsch an — über ein Formular, keine Handarbeit.

1. Portal → oben nach **„Deploy a custom template"** suchen → öffnen.
2. **„Build your own template in the editor"** klicken.
3. **„Load file"** → `infra/main.json` aus dem Repo hochladen
   *(oder den Inhalt hineinkopieren)* → **Save**.
4. Jetzt erscheint ein **Formular**. Ausfüllen:
   - **Resource group**: `nicolenders-rg`
   - **Acr Name**: `nicolendersacr`
   - **Container Image**: `nicolendersacr.azurecr.io/web:latest`
   - **Sql Admin Password**: starkes Passwort, mind. 12 Zeichen, **ohne
     Semikolon**
   - **Auth Secret**: Ergebnis von `npx auth secret` (oder ein langer
     Zufallsstring)
   - **Job Shared Secret**: irgendein langer Zufallsstring
   - **Admin Object Ids**: deine Entra Object ID (Portal → Entra ID → Users →
     dein Profil → „Object ID")
   - Rest kann leer bleiben (Entra-Login, LinkedIn, Budget = optional)
5. **Review + create** → **Create**. Dauer ~3–5 Min.
6. Nach dem Deployment: **„Outputs"** öffnen und **`webUrl`** sowie
   **`sqlServerFqdn`** kopieren.

## 6. Datenbank einrichten (einmalig, ein Befehl)

Das ist der einzige Schritt, der kurz ein Terminal braucht — am einfachsten die
**Cloud Shell** (Portal, Symbol `>_` oben) oder ein lokales Terminal mit
ausgechecktem Repo:

```bash
# 1) deine aktuelle IP an der SQL-Firewall freigeben
#    Portal-Alternative: SQL-Server → "Networking" → "Add your client IPv4 address" → Save
SQL_FQDN="<sqlServerFqdn aus Schritt 5>"
az sql server firewall-rule create -g nicolenders-rg -s ${SQL_FQDN%%.*} -n meine-ip \
  --start-ip-address $(curl -s https://api.ipify.org) --end-ip-address $(curl -s https://api.ipify.org)

# 2) Migration anwenden (im Repo-Ordner)
npm ci
export DATABASE_URL="sqlserver://$SQL_FQDN:1433;database=nicolendersdb;user=nicoleadmin;password=<dein-SQL-Passwort>;encrypt=true;trustServerCertificate=false"
npm run db:deploy
npm run db:seed        # optional: Beispieldaten
```

Die Firewall-Freigabe (Schritt 1) kannst du auch komplett im Portal machen:
**SQL-Server öffnen → „Networking" → „Selected networks" → „Add your client
IPv4 address" → Save.** Danach nur noch `npm ci`, `DATABASE_URL` setzen,
`npm run db:deploy`.

## 7. Öffentliche URL eintragen (im Portal)

Damit Feeds/Sitemap/Anmeldung die richtige Adresse nutzen:

1. Portal → Container App **`nicolenders-prod-web`** → **„Containers"** →
   **„Edit and deploy"**.
2. Container `web` anklicken → Reiter **„Environment variables"**.
3. Variable **`NEXT_PUBLIC_SITE_URL`** auf die **webUrl** aus Schritt 5 setzen.
4. **Save** → **Create** (legt eine neue Revision an).

**Fertig.** Öffne die webUrl im Browser.

---

## Neue Version ausrollen

1. Registry → Task `build-web` → **Run** (baut das Image neu), oder
   `az acr build -r nicolendersacr -t web:latest .`.
2. Container App `nicolenders-prod-web` → **„Revisions"** →
   **„Create new revision"** → gleiches Image, neuer Tag → **Create**.

## Anmeldung (Entra ID) später aktivieren

Portal → Entra ID → **App registrations** → **New**:
- Redirect-URI (Web):
  `https://<deine-webUrl>/api/auth/callback/microsoft-entra-id`
- Client-ID, ein Client-Secret und den Issuer
  (`https://login.microsoftonline.com/<tenant-id>/v2.0`) notieren.

Dann Container App → Environment variables ergänzen:
`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
`AUTH_MICROSOFT_ENTRA_ID_ISSUER` → Save.

## Wenn etwas klemmt

- **Vorlage lässt sich nicht ausrollen, „MissingSubscriptionRegistration"** →
  Schritt 1 nachholen.
- **Container App startet nicht** → App → **„Log stream"** ansehen. Häufig: DB
  noch nicht migriert (Schritt 6) oder falsches SQL-Passwort.
- **DB-Zugriff schlägt fehl** → Firewall (Schritt 6/„Networking") prüfen; die
  Free-DB „schläft" und braucht beim ersten Zugriff 30–60 s.
- **Registry-Name abgelehnt** → global eindeutig, nur Kleinbuchstaben/Ziffern.
