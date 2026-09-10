# Was die Website kostet — Befund, Maßnahmen, Prüfschritte

Stand: 10.09.2026. Anlass: 127,58 EUR in einem Monat allein für Azure SQL,
veranschlagt waren 10–15 EUR für alles zusammen (SPEC §14).

Die Entscheidung dahinter steht in `docs/decisions/0032-kosten-der-laufzeit.md`.
Diese Seite ist die praktische Kurzfassung: was schiefging, was jetzt anders ist
und was noch von Hand geprüft werden muss.

---

## Der Befund in einem Satz

Beide teuren Dienste rechnen **Laufzeit** ab, nicht Zugriffe — und die
Konfiguration sorgte dafür, dass beide rund um die Uhr liefen.

| # | Ursache | Wirkung | Behoben durch |
|---|---|---|---|
| 1 | `activeRevisionsMode: 'Multiple'` und `minReplicas: 1` | Jede je erzeugte Revision blieb aktiv und hielt ein Replica am Laufen. Zwei bis drei neue je Push auf `main`. | `'Single'` in `main.bicep`, dazu ein Aufräumschritt im Deploy-Workflow |
| 2 | Scheduler-Cron `*/5 * * * *` bei `autoPauseDelay: 60` | 288 Weckrufe am Tag; die serverlose Datenbank kam nie in eine Ruhephase. | Cron `0 * * * *`, `autoPauseDelay: 15`, und ein Tick, der ohne Datenbank entscheidet, ob er sie überhaupt braucht |
| 3 | Reichweiten-Erfassung schrieb bei jedem Seitenaufruf sofort in die Datenbank | Ein einzelner Besucher weckte sie für die Dauer des Auto-Pause-Delays. | Seitenaufrufe werden gesammelt und in Sammelfenstern gebündelt geschrieben |
| 4 | `app/sitemap.ts` prüfte bei jedem Aufruf per `SELECT 1` die Erreichbarkeit | Jeder Crawler-Besuch weckte die Datenbank. | Sitemap wird gecacht wie jeder andere öffentliche Zugriff |
| 5 | Cache-Frist von einer Stunde | Nach Ablauf ging der nächste Seitenaufruf wieder in die Datenbank — und wartete auf das Aufwachen. | 24 Stunden Frist, gezielte Invalidierung, Vorwärmen nach Deploy und Job-Lauf |

Rechnung zur Größenordnung: Eine Stunde Online-Zeit kostet bei 0,5 vCore rund
0,24 EUR. Dauerbetrieb sind damit etwa 175 EUR im Monat — die 127,58 EUR liegen
in dieser Größenordnung.

---

## Zur Free-Offer-Region

Richtig ist: Die Region des Free Offer wird je Subscription **einmal** festgelegt
und gilt danach für alle bis zu zehn Free-Datenbanken; sie ist nicht änderbar.
Die Infrastruktur läuft tatsächlich in **West Europe** — die FQDN der Container
App (`…westeurope.azurecontainerapps.io`) und die Resource Group sagen das,
während `main.bicepparam` `germanywestcentral` als Beispielwert führt. Der
Verdacht ist also begründet und muss geprüft werden.

**Er ist aber nicht nötig, um die Rechnung zu erklären.** Das Free Offer deckt
100.000 vCore-Sekunden im Monat; bei 0,5 vCore Mindestgröße sind das rund **55
Stunden Online-Zeit**. Eine Datenbank, die nie pausiert, verbraucht das in gut
zwei Tagen. Danach gibt es nur zwei Möglichkeiten:

- `AutoPause` (so steht es im Bicep, so will es SPEC §14): Die Seite wäre den
  Rest des Monats nicht erreichbar gewesen. Das ist nicht passiert.
- `BillOverUsage`: Die Datenbank bleibt online und wird abgerechnet — was zu
  einer Rechnung in genau dieser Höhe führt.

Wenn also in Azure `freeLimitExhaustionBehavior` auf `BillOverUsage` steht,
weicht die laufende Datenbank vom Template ab, und die Rechnung ist erklärt,
ohne dass die Region schuld sein muss. Beide Fälle sind mit demselben Befehl zu
unterscheiden (siehe „Prüfen", Punkt 2).

---

## Sofort, von Hand (wirkt ohne Deployment)

Die Änderungen an `main.bicep` wirken erst bei einem Template-Deployment — der
laufende Deploy-Workflow rollt nur das Image aus. Diese drei Schritte ändern den
teuersten Teil sofort:

```bash
# 1. Wie viele Revisionen laufen gerade wirklich?
az containerapp revision list -n nicolenders-prod-web -g nicolenders-rg \
  --query "[?properties.active].{name:name, created:properties.createdTime, replicas:properties.replicas}" \
  -o table

# 2. Auf Single-Revision umstellen (erzeugt selbst keine Revision)
az containerapp revision set-mode -n nicolenders-prod-web -g nicolenders-rg --mode single

# 3. Alles deaktivieren außer der Revision, die gerade ausliefert
CURRENT=$(az containerapp show -n nicolenders-prod-web -g nicolenders-rg \
  --query "properties.latestReadyRevisionName" -o tsv)
for REV in $(az containerapp revision list -n nicolenders-prod-web -g nicolenders-rg \
      --query "[?properties.active].name" -o tsv); do
  [ "$REV" = "$CURRENT" ] && continue
  echo "Deaktiviere $REV"
  az containerapp revision deactivate -n nicolenders-prod-web -g nicolenders-rg --revision "$REV"
done
```

Schritt 2 und 3 erledigt der Deploy-Workflow ab jetzt bei jedem Lauf selbst.

Die Datenbank-Einstellungen ebenfalls sofort, ohne Template-Deployment:

```bash
SQL_SERVER=$(az sql server list -g nicolenders-rg --query "[0].name" -o tsv)
az sql db update -g nicolenders-rg -s "$SQL_SERVER" -n nicolendersdb --auto-pause-delay 15
```

---

## Prüfen

**1. Läuft wirklich nur noch eine Revision?**

```bash
az containerapp revision list -n nicolenders-prod-web -g nicolenders-rg \
  --query "length([?properties.active])"
```

Erwartet: `1`.

**2. Was ist an der Datenbank tatsächlich eingestellt?**

```bash
SQL_SERVER=$(az sql server list -g nicolenders-rg --query "[0].name" -o tsv)
az sql db show -g nicolenders-rg -s "$SQL_SERVER" -n nicolendersdb \
  --query "{region:location, sku:currentSku.name, freeLimit:useFreeLimit, \
            beiErschoepfung:freeLimitExhaustionBehavior, autoPause:autoPauseDelay, \
            minVCore:minCapacity, status:status}"
```

Zu klären:

- `freeLimit` — steht dort `false`, greift das Free Offer nicht (Region oder
  bereits anderweitig vergeben).
- `beiErschoepfung` — steht dort `BillOverUsage` statt `AutoPause`, weicht die
  laufende Datenbank vom Template ab. Das erklärt die Rechnung (siehe oben).
- `region` — hier wird die Region schwarz auf weiß sichtbar.

**3. Welche Region hat das Free Offer dieser Subscription?**

Dafür gibt es keinen direkten CLI-Befehl. Der verlässliche Weg ist das Portal:
*SQL-Datenbanken → Erstellen → „Möchten Sie das kostenlose Angebot nutzen?"* —
die dort fest angezeigte Region ist die der Subscription. Zusätzlich zeigt die
Übersichtsseite einer Free-Datenbank das verbleibende Freikontingent des Monats;
fehlt diese Anzeige, ist die Datenbank keine Free-Datenbank.

Ergänzend, um alle Free-Datenbanken der Subscription zu sehen:

```bash
az sql db list --query "[?useFreeLimit].{name:name, region:location}" -o table
```

**4. Wirkt es? (nach ein paar Tagen)**

```bash
SQL_ID=$(az sql db show -g nicolenders-rg -s "$SQL_SERVER" -n nicolendersdb --query id -o tsv)
az monitor metrics list --resource "$SQL_ID" --metric app_cpu_billed \
  --interval PT1H --aggregation total -o table
```

`app_cpu_billed` sind die abgerechneten vCore-Sekunden. Erwartet: die meisten
Stunden **null**, mit Ausschlägen in den Sammelfenstern (00, 06, 12, 18 Uhr UTC),
bei Veröffentlichungen und während der Arbeit im Adminbereich.

Gegenprobe im Portal: *Kostenanalyse → nach Ressource gruppieren*, Vergleich
Vor- und Folgemonat.

---

## Erwartung danach

| Posten | Vorher | Erwartet |
|---|---|---|
| Azure SQL | 127,58 EUR | 1–2 h Online-Zeit am Tag → etwa 7–12 EUR, im Free Offer 0 EUR |
| Container App `web` | ein Replica je jemals erzeugter Revision | ein Replica → 4–8 EUR |
| Container Registry (Basic) | ~5 EUR | unverändert ~5 EUR |
| Rest (Storage, Logs, Identity) | < 1 EUR | unverändert |

Das Budget aus SPEC §14 (Alarm bei 25 EUR im Monat) ist damit wieder das, was es
sein soll: eine Reißleine, keine Ankündigung.

## Was diese Rechnung nicht abdeckt

- Wie viel Zeit Nicole im Adminbereich verbringt. Dort ist die Datenbank wach,
  und das ist richtig so.
- Ungewöhnlichen Andrang auf die öffentliche Seite. Der Cache fängt Leser ab,
  aber `maxReplicas: 3` bleibt die Obergrenze.
- Einen Monat mit vielen Deployments: Jeder Container-Start weckt die Datenbank
  für die Migration.
