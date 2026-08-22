# Adminbereich-Umbau: Migration von Hand ausführen

**Migration:** `20260822120000_admin_umbau`
**Skript:** [`2026-08-22-admin-umbau.sql`](./2026-08-22-admin-umbau.sql)
**Betrifft:** Azure SQL, Datenbank `nicolenders`

Diese Anleitung ist für den Fall, dass du die Schema-Änderung selbst in der Hand
haben willst — im Portal-Abfrage-Editor oder mit `sqlcmd`. **Nötig ist sie
nicht:** Die Anwendung führt beim Serverstart `prisma migrate deploy` selbst aus
(`instrumentation.ts`). Wer nichts tut, bekommt die Migration mit dem nächsten
Deployment automatisch.

Der manuelle Weg lohnt sich, wenn du daneben sitzen und die Zahlen vorher und
nachher sehen willst — oder wenn der automatische Lauf gescheitert ist.

---

## Das Wichtigste vorweg

**Diese Migration löscht Tabellen und Spalten.** Es gibt kein Down-Skript. Der
einzige Rückweg ist die Wiederherstellung der Datenbank auf einen Zeitpunkt
davor. Deshalb ist Schritt 1 keine Formalie.

**Die Migration muss nach dem Ausführen verbucht werden** (Schritt 5). Sonst
versucht der nächste Serverstart sie erneut, findet die Tabellen nicht mehr und
protokolliert einen Fehlschlag.

---

## 1. Wiederherstellungspunkt sichern

Azure SQL sichert im Hintergrund fortlaufend (Point-in-time-Restore). Für diese
Migration reicht das — du musst nur wissen, **auf welchen Zeitpunkt** du
zurückgehen würdest.

1. Azure-Portal → SQL-Datenbank `nicolenders` → **Wiederherstellen**
2. Nachsehen, dass „Frühester Wiederherstellungspunkt" weit genug zurückreicht
3. **Aktuelle UTC-Zeit notieren** — das ist dein Punkt „kurz vor der Migration"

Wer es handfester mag: Datenbank → **Exportieren** → BACPAC in den Storage
Account. Dauert ein paar Minuten und liegt dann als Datei vor.

---

## 2. Vorher zählen

Im Abfrage-Editor (Portal → SQL-Datenbank → **Abfrage-Editor**) oder in Azure
Data Studio ausführen. Nichts davon ändert etwas — es sagt dir nur, was gleich
passiert:

```sql
SELECT
    (SELECT COUNT(*) FROM [dbo].[Mission])                                    AS [Einsätze],
    (SELECT COUNT(*) FROM [dbo].[Mission] WHERE [attendeeCount] IS NOT NULL)  AS [mit Teilnehmerzahl],
    (SELECT COUNT(*) FROM [dbo].[Tag])                                        AS [Schlagworte],
    (SELECT COUNT(*) FROM [dbo].[Redirect])                                   AS [Weiterleitungen],
    (SELECT COUNT(*) FROM [dbo].[IdentityAttribute])                          AS [Merkmale],
    (SELECT COUNT(*) FROM [dbo].[Taxonomy] WHERE [kind] = N'CERTIFICATION')   AS [Zert-Kategorien];
```

Steht bei „Schlagworte", „Weiterleitungen" oder „Merkmale" eine Zahl, die dich
überrascht: **jetzt** nachsehen, was da drinsteht. Nach der Migration ist es weg.

```sql
SELECT * FROM [dbo].[Redirect];
SELECT [nameDe], [nameEn] FROM [dbo].[Tag];
SELECT [labelDe], [valueDe] FROM [dbo].[IdentityAttribute];
```

---

## 3. Deployment vorbereiten

Damit der Serverstart dir nicht dazwischenfunkt, während du von Hand arbeitest:

```bash
az containerapp update \
  --name nicolenders-prod-web \
  --resource-group nicolenders-rg \
  --set-env-vars "SKIP_STARTUP_MIGRATE=1"
```

Das erzeugt eine neue Revision und startet die App neu — ohne Migrationslauf.

**Reihenfolge, die die kürzeste Störung ergibt:**

1. `SKIP_STARTUP_MIGRATE=1` setzen (jetzt)
2. Pull Request mergen → das Deployment läuft (5–10 Minuten). Die neue App
   startet und erwartet das neue Schema, das es noch nicht gibt — **in diesem
   Fenster zeigt der Adminbereich Fehler.**
3. Sofort danach das SQL-Skript ausführen (Schritt 4, dauert Sekunden)
4. Migration verbuchen (Schritt 5)
5. `SKIP_STARTUP_MIGRATE` wieder entfernen (Schritt 7)

Umgekehrt — erst SQL, dann mergen — wäre das Fenster so lang wie das
Deployment. Deshalb diese Reihenfolge.

> Willst du gar keine Störung: Schritt 3 überspringen, einfach mergen und die
> App migrieren lassen. Dann ist dieses Dokument nur die Kontrollliste.

---

## 4. Das Skript ausführen

Inhalt von [`2026-08-22-admin-umbau.sql`](./2026-08-22-admin-umbau.sql)
vollständig einfügen und ausführen.

**Portal-Abfrage-Editor:** SQL-Datenbank → Abfrage-Editor → anmelden →
einfügen → **Ausführen**. Die `PRINT`-Zeilen stehen danach unter „Meldungen".

**sqlcmd (empfohlen, weil die Ausgabe vollständig kommt):**

```bash
sqlcmd -S nicolenders-sql.database.windows.net -d nicolenders \
       -U nicoleadmin -P '<Passwort>' -G \
       -i docs/db/2026-08-22-admin-umbau.sql
```

**Was das Skript tut** (in einer Transaktion — entweder ganz oder gar nicht):

| Schritt | Was passiert |
| --- | --- |
| 1/8 | Tabelle `MissionReportTask` anlegen und **für alle bestehenden Einsätze befüllen**; wo der deutsche Bericht schon steht, gleich als erledigt |
| 2/8 | `Dispatch.reminderSentAt` ergänzen |
| 3/8 | `attendeesOnsite/Remote`, `onDemandViews` ergänzen, `attendeeCount` **dorthin übernehmen** und dann löschen; Folien-URL/-Plattform und Feedback-Felder löschen |
| 4/8 | `ResumeEntry` um Projekt- und Fähigkeitsfelder erweitern |
| 5/8 | `PostTag`, `_DispatchTags`, `Tag` löschen |
| 6/8 | `Redirect` löschen |
| 7/8 | `IdentityAttribute` löschen |
| 8/8 | `_CertificationCategories` und `Certification.categoryId` löschen, Taxonomie-Einträge der Art `CERTIFICATION` entfernen |

Das Skript ist **wiederholbar**: Jeder Schritt prüft erst, ob er nötig ist.
Bricht es in der Mitte ab, rollt alles zurück, und du kannst es nach Behebung
der Ursache einfach erneut ausführen.

Erwartete Ausgabe am Ende:

```
Fertig. JETZT die Migration verbuchen — Abschnitt 5 der Anleitung.
```

---

## 5. Migration verbuchen — nicht überspringen

Prisma führt in `_prisma_migrations` Buch. Ohne Eintrag hält der nächste
Serverstart die Migration für ausstehend und versucht sie noch einmal.

### Weg A — mit der Prisma-CLI (sicherer, Prüfsumme wird selbst berechnet)

```bash
DATABASE_URL='<Verbindungszeichenfolge>' npx prisma migrate resolve \
  --applied 20260822120000_admin_umbau
```

Danach zur Kontrolle:

```bash
DATABASE_URL='<Verbindungszeichenfolge>' npx prisma migrate status
```

Erwartet: *Database schema is up to date!*

### Weg B — von Hand, wenn keine CLI zur Hand ist

Die Prüfsumme ist der SHA-256 der Datei
`prisma/migrations/20260822120000_admin_umbau/migration.sql`. Für den Stand in
diesem Branch:

```
9aa8465669da114245731704b9eacd9739f831a8866b668af139ca4b897a8007
```

**Vorher nachrechnen**, denn die Prüfsumme ändert sich mit jeder Änderung an der
Datei — auch mit Zeilenenden aus einem Windows-Checkout:

```bash
sha256sum prisma/migrations/20260822120000_admin_umbau/migration.sql   # Linux/macOS
certutil -hashfile prisma\migrations\20260822120000_admin_umbau\migration.sql SHA256   # Windows
```

Dann:

```sql
INSERT INTO [dbo].[_prisma_migrations]
    ([id], [checksum], [migration_name], [started_at], [finished_at], [applied_steps_count])
VALUES
    (LOWER(CONVERT(NVARCHAR(36), NEWID())),
     N'9aa8465669da114245731704b9eacd9739f831a8866b668af139ca4b897a8007',
     N'20260822120000_admin_umbau',
     SYSDATETIMEOFFSET(),
     SYSDATETIMEOFFSET(),
     1);
```

Stimmt die Prüfsumme nicht, meldet `prisma migrate status` später eine
„modified" Migration. Repariert wird das mit demselben `INSERT` nach einem
`DELETE FROM [dbo].[_prisma_migrations] WHERE [migration_name] = N'20260822120000_admin_umbau';`.

---

## 6. Nachher prüfen

```sql
-- Die Aufgaben sind da, eine je Einsatz
SELECT
    (SELECT COUNT(*) FROM [dbo].[Mission])                                        AS [Einsätze],
    (SELECT COUNT(*) FROM [dbo].[MissionReportTask])                              AS [Aufgaben],
    (SELECT COUNT(*) FROM [dbo].[MissionReportTask] WHERE [status] = N'OPEN')     AS [offen],
    (SELECT COUNT(*) FROM [dbo].[MissionReportTask] WHERE [status] = N'DONE')     AS [erledigt];

-- Die Teilnehmerzahlen sind mitgekommen
SELECT COUNT(*) AS [mit Präsenzzahl] FROM [dbo].[Mission] WHERE [attendeesOnsite] IS NOT NULL;

-- Die alten Tabellen sind weg (erwartet: vier Mal NULL)
SELECT OBJECT_ID(N'[dbo].[Tag]')               AS [Tag],
       OBJECT_ID(N'[dbo].[Redirect]')          AS [Redirect],
       OBJECT_ID(N'[dbo].[IdentityAttribute]') AS [IdentityAttribute],
       OBJECT_ID(N'[dbo].[PostTag]')           AS [PostTag];

-- Die Migration ist verbucht (erwartet: eine Zeile mit finished_at)
SELECT [migration_name], [finished_at], [rolled_back_at], [applied_steps_count]
  FROM [dbo].[_prisma_migrations]
 WHERE [migration_name] = N'20260822120000_admin_umbau';
```

„Aufgaben" muss gleich „Einsätze" sein. Ist die Zahl kleiner, hat der
`INSERT` nicht alle erwischt — Skript einfach noch einmal ausführen, es holt
die fehlenden nach.

---

## 7. Automatik wieder einschalten

```bash
az containerapp update \
  --name nicolenders-prod-web \
  --resource-group nicolenders-rg \
  --remove-env-vars "SKIP_STARTUP_MIGRATE"
```

Danach im Adminbereich gegenprüfen:

- **Terminkalender → Einsatzberichte**: die offenen Aufgaben stehen da
- **Einsatz bearbeiten → Belegmaterial**: die drei Publikumsfelder, Präsenz
  vorbelegt
- **Einstellungen → Fachgebiete**: die Liste ist da, keine Zertifizierungs-
  Kategorien mehr
- **Einstellungen → Erinnerungen**: Vorlauf und Empfängeradresse setzen

---

## Wenn etwas schiefgeht

**Das Skript bricht ab.** Es rollt zurück, es wurde nichts geändert. Die
Fehlermeldung nennt die Ursache; nach der Behebung erneut ausführen.

**Das Skript lief durch, aber die Anwendung meldet Schema-Fehler.** Meist fehlt
die Verbuchung (Schritt 5) oder das Deployment mit dem neuen Code steht noch
aus. `prisma migrate status` sagt, was Prisma sieht.

**Es muss wirklich zurück.** Azure-Portal → SQL-Datenbank → **Wiederherstellen**
→ Zeitpunkt aus Schritt 1. Das erzeugt eine **neue** Datenbank; danach die
Verbindungszeichenfolge umstellen oder die alte umbenennen und die
wiederhergestellte an ihre Stelle setzen. Und: den Code auf den Stand vor dem
Merge zurücknehmen, sonst erwartet die Anwendung weiter das neue Schema.
