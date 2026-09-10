# 0032 — Die Laufzeit kostet, nicht die Abfrage

**Datum:** 10.09.2026
**Status:** angenommen

---

## Kontext

Die Kostenanalyse in Azure wies für einen Monat **127,58 EUR** allein für die
Azure-SQL-Datenbank aus. Geplant waren laut SPEC §14 zehn bis fünfzehn Euro für
die gesamte Infrastruktur, und die Datenbank sollte im Free Offer bei null Euro
liegen. Die Container Apps standen deutlich über den veranschlagten vier bis
acht Euro.

Die Ursachensuche fand nicht einen Fehler, sondern vier, die alle dieselbe
Annahme teilen: dass ein einzelner, kleiner Zugriff auch nur wenig kostet. Bei
den beiden verwendeten Diensten stimmt das nicht — abgerechnet wird **Laufzeit**,
nicht Zugriff.

### 1. Jede je erzeugte Revision lief weiter

`infra/main.bicep` stellte die Container App auf `activeRevisionsMode: 'Multiple'`
— gedacht für Rollback per Traffic-Switch (SPEC §15). Im Mehrfach-Modus bleibt
aber jede erzeugte Revision aktiv, bis jemand sie von Hand deaktiviert. Zusammen
mit `minReplicas: 1` hält jede aktive Revision dauerhaft ein Replica am Laufen.

Der Deploy-Workflow erzeugt pro Push auf `main` zwei bis drei Revisionen (Image,
`secret set`, `update --set-env-vars`). Die Rechnung wuchs also mit jedem Merge.
Inaktive Revisionen kosten nichts — es fehlte nur der Schritt, der sie inaktiv
macht.

### 2. Die Datenbank kam nie zur Ruhe

Die Datenbank ist serverlos und pausiert nach `autoPauseDelay` ohne Aktivität.
Bezahlt wird die Online-Zeit, nicht die Abfrage. Drei Dinge weckten sie
permanent:

- der Scheduler-Job **alle fünf Minuten** — 288 Weckrufe am Tag, bei einem
  Auto-Pause-Delay von 60 Minuten kam sie nie auch nur in die Nähe einer
  Ruhephase;
- **jeder Seitenaufruf**: die Reichweiten-Erfassung (ADR 0010) schrieb sofort
  eine Zeile in die Datenbank;
- **jeder Crawler-Besuch der Sitemap**: `app/sitemap.ts` prüfte bei jedem Aufruf
  mit `SELECT 1`, ob die Datenbank erreichbar ist;
- und der Cache lief nach einer Stunde ab, sodass die nächste Anfrage danach
  ohnehin wieder in die Datenbank ging.

Eine Stunde Online-Zeit kostet bei 0,5 vCore rund 0,24 EUR. Rund um die Uhr sind
das etwa 175 EUR im Monat — die 127,58 EUR liegen genau in dieser Größenordnung.

### 3. Das Free Offer griff vermutlich nie

Die Region des Free Offer wird je Subscription **einmal** festgelegt und gilt
danach für alle Free-Datenbanken; sie ist nicht änderbar. Die Infrastruktur
läuft tatsächlich in **West Europe** (erkennbar an der FQDN der Container App:
`…wittybush-b6a6f63e.westeurope.azurecontainerapps.io`), während
`infra/main.bicepparam` `germanywestcentral` als Beispielwert führt. Passt die
Region nicht, wirkt `useFreeLimit: true` nicht — ohne Fehlermeldung, zum vollen
Serverless-Tarif.

### 4. Selbst mit Free Offer wäre es schiefgegangen

Das Free Offer deckt 100.000 vCore-Sekunden im Monat. Bei einer Mindestgröße von
0,5 vCore sind das rund **55 Stunden Online-Zeit** — eine dauerhaft wache
Datenbank verbraucht das in gut zwei Tagen. Mit
`freeLimitExhaustionBehavior: 'AutoPause'` (SPEC §14) wäre die Seite danach für
den Rest des Monats nicht erreichbar gewesen. Dass das nie passiert ist, ist ein
weiteres Indiz dafür, dass das Free Offer gar nicht griff.

## Entscheidung

**Die Laufzeit wird zur knappen Ressource erklärt.** Jeder Zugriff auf die
Datenbank braucht einen Grund, und Zugriffe ohne Grund werden gebündelt oder
abgeschafft.

**Infrastruktur (`infra/main.bicep`)**

- `activeRevisionsMode: 'Single'` — Container Apps deaktiviert die alte Revision
  automatisch, sobald die neue bereit ist.
- `autoPauseDelay: 15` statt 60 (Minimum seit Oktober 2024).
- Scheduler-Cron `0 * * * *` statt `*/5 * * * *`.
- Log-Analytics-Deckel von 1 GB auf 0,5 GB pro Tag.

**Anwendung**

- Der Job-Tick ist **zweistufig**. Zuerst entscheidet er ohne Datenbank, ob
  überhaupt etwas zu tun ist — Grundlage ist eine Terminnotiz, die der letzte
  vollständige Lauf außerhalb der Datenbank hinterlassen hat (im privaten
  Blob-Container, `lib/jobs/schedule-hint.ts`). Erst wenn ein Termin fällig ist,
  ein Sammelfenster ansteht oder die Notiz fehlt bzw. älter als sechs Stunden
  ist, wird die Datenbank geweckt.
- **Seitenaufrufe werden gesammelt** (`lib/analytics/buffer.ts`) und im
  Sammelfenster gebündelt geschrieben, statt einzeln bei jedem Besuch.
- **Die Sitemap wird gecacht** wie jeder andere öffentliche Zugriff.
- Die **Cache-Frist steigt von einer Stunde auf 24 Stunden**. Sie ist nur das
  Sicherheitsnetz; invalidiert wird gezielt über Tags beim Veröffentlichen und
  bei jeder Änderung im Adminbereich.
- Damit ein Leser vom Pausieren nichts merkt, wird der Cache **vorgewärmt**
  (`lib/jobs/warmup.ts`): nach dem Start eines Containers und am Ende jedes
  vollständigen Job-Laufs, also immer dann, wenn die Datenbank ohnehin wach ist.
  Die Liste der Seiten kommt aus der Sitemap.

**Rollback**

Der Traffic-Switch funktioniert nur im Mehrfach-Modus. Rollback läuft deshalb
über `az containerapp revision copy` — dieselbe Wirkung, ohne dass dauerhaft
zwei Revisionen laufen (`.github/workflows/rollback.yml`, SPEC §15).

## Konsequenzen

**Was besser wird**

- Container Apps: ein Replica statt so vieler, wie es Deployments gab.
- Datenbank: Online-Zeit von rund 24 Stunden am Tag auf ein bis zwei Stunden —
  vier feste Sammelfenster plus tatsächliche Veröffentlichungen und die Zeit,
  die Nicole im Adminbereich verbringt.
- Leser merken vom Pausieren nichts mehr: Öffentliche Seiten kommen aus dem
  vorgewärmten Cache.

**Was schlechter wird**

- **Terminierte Beiträge erscheinen zur vollen Stunde**, nicht auf fünf Minuten
  genau. Für eine Website, die eine Person nebenbei pflegt, ist das kein
  Verlust.
- **Reichweitenzahlen hinken hinterher.** Ein Aufruf steht bis zu sechs Stunden
  später in der Auswertung, und beim Neustart eines Containers geht der
  ungeschriebene Rest verloren. Reichweitenzahlen sind kein Kassenbuch.
- **Der Adminbereich weckt die Datenbank weiterhin** — das ist richtig so: wer
  schreibt, braucht sie.
- **Eine neue Fehlerquelle:** Die Terminnotiz kann veralten. Deshalb verfällt
  sie nach sechs Stunden, wird bei jeder Inhaltsänderung verworfen, und jeder
  Zweifel (fehlende Notiz, unlesbares JSON, kein Blob-Zugriff) führt zum
  vollständigen Lauf. Der teure Fall ist der sichere.

**Was offen bleibt und geprüft werden muss**

Ob das Free Offer für diese Subscription in West Europe überhaupt gilt, lässt
sich nur im Portal bzw. per CLI feststellen. Die Prüfschritte stehen in
`infra/KOSTEN.md`. Ergebnis offen — die Maßnahmen oben wirken unabhängig davon,
weil sie die Online-Zeit senken statt auf ein Freikontingent zu setzen.
