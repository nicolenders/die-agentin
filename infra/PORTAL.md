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

## 4. Container-Image bauen

**Was passiert hier?** Die Registry aus Schritt 3 ist ein leeres Lager. In
diesem Schritt wird der Website-Code in ein startfähiges Paket („Container-
Image") verpackt und in dieses Lager gelegt, damit die App es später ausführen
kann. Das Verpacken kann nicht durch reines Klicken passieren — es braucht eine
Build-Maschine. Azure übernimmt das Bauen für dich (`az acr build` / ACR-Task),
**du brauchst kein Docker**.

> **Die „Tasks"-Oberfläche der Registry im Portal ist fummelig** (der
> „Add task"-Knopf ist oft ausgegraut). Nutz sie nicht — nimm stattdessen einen
> der folgenden Wege.

Wähle **einen** der drei Wege:

### Weg C — über GitHub, nur klicken (empfohlen, wenn du kein Terminal willst)

Baut das Image per Knopfdruck in GitHub. Der fertige Ablauf liegt schon im Repo
(`.github/workflows/build-image.yml`).

1. **Registry-Zugang aktivieren:** Portal → Registry `nicolendersacr` → links
   **„Access keys"** → **„Admin user"** auf **Enabled** → **Username** und
   **password** stehen bleiben lassen (gleich kopieren).
2. **In GitHub 3 Secrets anlegen:** Repo `nicolenders/die-agentin` → **Settings**
   → **Secrets and variables** → **Actions** → **New repository secret**:
   - `ACR_LOGIN_SERVER` = `nicolendersacr.azurecr.io`
   - `ACR_USERNAME` = der Username aus Schritt 1
   - `ACR_PASSWORD` = das password aus Schritt 1
3. **Bauen:** GitHub → Tab **„Actions"** → links **„Build & push image"** →
   rechts **„Run workflow"** → Tag `latest` lassen → **„Run workflow"**.
4. Nach ~2–3 Min. grüner Haken. Das Image liegt dann in der Registry unter
   **„Repositories" → `web`**.

*(Den ACR-Admin-Zugang kannst du nach dem ersten Deployment wieder deaktivieren —
die App zieht das Image über eine Managed Identity, nicht über diese Kennung.)*

### Weg A — ein Befehl (am einfachsten, wenn du das Projekt auf dem Rechner hast)

Terminal im Projektordner (dort, wo das `Dockerfile` liegt):
```bash
az login
az acr build -r nicolendersacr -t web:latest .
```
Kein Docker, kein GitHub-Token nötig (baut aus deinen lokalen Dateien).
Das geht auch in der Cloud Shell — es ist nur **ein** kurzer Befehl.

> Hinweis: Der frühere Weg über die ACR-„Tasks"-Oberfläche im Portal
> („Services → Tasks → Add task") wird hier bewusst nicht mehr empfohlen — der
> Knopf ist häufig ausgegraut/eingeschränkt. Weg C ersetzt ihn vollständig.

**Ergebnis (alle Wege):** In der Registry liegt jetzt `web:latest`. Weiter mit
Schritt 5.

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
