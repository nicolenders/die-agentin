# Mailversand einrichten (Google-Konto)

Die Website verschickt genau eine Sorte Mail: die Erinnerung an ein nahendes
Veröffentlichungsdatum einer Depesche (siehe
`docs/decisions/0023-erinnerungsmail-per-smtp.md`). Dafür braucht sie einen
SMTP-Zugang. Google bringt einen mit — er muss nur freigeschaltet und an drei
Stellen hinterlegt werden.

Solange `SMTP_HOST` und `SMTP_FROM` fehlen, wird nichts verschickt. Der
Adminbereich sagt das unter **Einstellungen → Erinnerungen** ausdrücklich,
statt still auszufallen.

## 1. App-Passwort bei Google erzeugen

Ein App-Passwort ist ein 16-stelliges Ersatzpasswort für Programme, die kein
Google-Login-Fenster anzeigen können. Das eigentliche Kontopasswort funktioniert
für SMTP nicht.

1. Zwei-Faktor-Bestätigung einschalten, falls noch nicht geschehen:
   <https://myaccount.google.com/signinoptions/two-step-verification>
   Ohne sie bietet Google keine App-Passwörter an.
2. App-Passwort anlegen: <https://myaccount.google.com/apppasswords>
   Als Name z. B. `nicolenders.com Website` eintragen.
3. Google zeigt 16 Buchstaben in vier Blöcken. Das ist das Passwort — die
   Leerzeichen gehören nicht dazu, sie sind nur zum Ablesen. Der Wert wird
   danach nicht wieder angezeigt.

Bei einem Google-Workspace-Konto (eigene Domain statt `@gmail.com`) gilt
dasselbe. Falls der Punkt „App-Passwörter" fehlt, hat die Workspace-Verwaltung
sie abgeschaltet.

## 2. Werte für die Konfiguration

| Name            | Wert                                              | Art      |
| --------------- | ------------------------------------------------- | -------- |
| `SMTP_HOST`     | `smtp.gmail.com`                                  | Variable |
| `SMTP_PORT`     | `587`                                             | Variable |
| `SMTP_FROM`     | `Die Agentin <DEINE-ADRESSE@gmail.com>`           | Variable |
| `SMTP_USER`     | `DEINE-ADRESSE@gmail.com`                         | Secret   |
| `SMTP_PASSWORD` | das App-Passwort aus Schritt 1, ohne Leerzeichen  | Secret   |

Zur Absenderadresse: Google verschickt nur unter der Adresse, mit der sich die
Website anmeldet. Steht in `SMTP_FROM` eine andere Adresse, ersetzt Google sie
stillschweigend durch die eigene. Wer als `zentrale@nicolenders.com` senden
will, hinterlegt diese Adresse zuerst in Gmail unter *Einstellungen → Konten
und Import → Senden als* und bestätigt die Rückfrage-Mail. Erst danach darf sie
in `SMTP_FROM` stehen.

Port 587 ist der Normalfall (STARTTLS). Wer 465 einträgt, bekommt eine von
Beginn an verschlüsselte Verbindung; beides funktioniert.

## 3. In GitHub hinterlegen

Repository → **Settings** → **Secrets and variables** → **Actions**

- Reiter **Variables**, Knopf *New repository variable*:
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
- Reiter **Secrets**, Knopf *New repository secret*:
  `SMTP_USER`, `SMTP_PASSWORD`

Secrets zeigt GitHub nach dem Speichern nie wieder an — das App-Passwort also
vorher in den Passwortmanager legen. Ändert es sich, wird das Secret
überschrieben, nicht ergänzt.

## 4. Deployment auslösen

Der Deploy-Workflow setzt die Werte bei jedem Lauf auf die Container App
(`.github/workflows/nicolenders-prod-web-AutoDeployTrigger-*.yml`). Solange
kein Deployment läuft, kennt die laufende Anwendung die neuen Werte nicht.

Actions → *nicolenders-prod-web AutoDeployTrigger* → **Run workflow**. Oder
einfach den nächsten Push nach `main` abwarten.

## 5. Nachsehen, ob es wirkt

Adminbereich → **Einstellungen** → **Erinnerungen**:

- Die Warnung „Es ist noch kein Mailversand eingerichtet" ist verschwunden.
- **Erinnerungen verschicken** ist angehakt.
- **Vorlauf** steht auf der gewünschten Zahl Tage (Standard: 3, erlaubt 1–90).
- **Empfängeradresse** stimmt.

Der Erinnerungslauf hängt am Job-Endpunkt `/api/jobs/run`, der ohnehin alle
fünf Minuten aufgerufen wird. Eine Depesche mit einem Veröffentlichungsdatum
innerhalb der Vorlaufzeit löst beim nächsten Lauf eine Mail aus — einmal je
Termin. Wird das Datum verschoben, erinnert die Zentrale erneut.

Kommt keine Mail an: Ein fehlgeschlagener Versand wird im Audit-Log der
Datenbank als `dispatch.reminder.failed` festgehalten, samt der Antwort des
Mailservers. Eine Oberfläche dafür gibt es noch nicht — lokal zeigt
`npm run db:studio` die Tabelle `AuditLog`.

## Lokal ausprobieren

In `.env.local` dieselben fünf Werte eintragen (Vorlage: `.env.example`) und
`npm run dev` neu starten. Die Datei ist nicht im Repository und darf es nicht
werden.
