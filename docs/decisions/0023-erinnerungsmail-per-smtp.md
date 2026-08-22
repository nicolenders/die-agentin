# 0023 — Erinnerungsmail über einen eigenen SMTP-Versand

**Datum:** 22.08.2026
**Status:** angenommen

## Kontext

Eine Depesche bekommt beim Anlegen ein Veröffentlichungsdatum und wird dann
liegen gelassen. Der Termin kommt näher, ohne dass jemand die Inhalte noch
einmal ansieht — die Zentrale weiß es, sagt aber nichts. Gewünscht ist eine
Mail einige Tage vorher, an eine konfigurierbare Adresse, mit dem Hinweis, die
Inhalte zu prüfen und den Status zu setzen.

Damit verschickt diese Website zum ersten Mal überhaupt eine Mail. Bis hierher
gab es dafür weder eine Abhängigkeit noch eine Konfiguration.

## Entscheidung

Ein **eigener, minimaler SMTP-Client** in `lib/mail/`, ohne neue Abhängigkeit.

- `lib/mail/message.ts` baut die RFC-5322-Nachricht (reiner Text, UTF-8,
  Base64) — rein und geprüft.
- `lib/mail/smtp.ts` spricht das Protokoll: implizites TLS (Port 465) oder
  STARTTLS (587), `AUTH PLAIN`, ein Empfänger je Nachricht.
- `lib/mail/send.ts` liest die Zugangsdaten aus der Umgebung
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
  `SMTP_FROM`) und meldet Fehler zurück, statt zu werfen.

Der Erinnerungslauf hängt am bestehenden Job-Endpunkt `/api/jobs/run`, der
ohnehin alle fünf Minuten aufgerufen wird. Vorlaufzeit, Empfängeradresse und
An/Aus stehen als `SiteSetting` in den Einstellungen; erinnert wird einmal je
Termin (`Dispatch.reminderSentAt`), und ein verschobener Termin setzt die
Marke zurück.

## Begründung

Verschickt werden ein paar kurze Textmails im Monat an genau eine Adresse.
Eine Mailbibliothek brächte dafür Funktionen mit, die hier nie gebraucht
werden — Anhänge, HTML-Teile, Pools, Warteschlangen — und eine Abhängigkeit,
die jemand über Jahre mitpflegen müsste. Das Protokoll für diesen Ausschnitt
ist klein und stabil; die heiklen Teile (Antwortcodes, STARTTLS-Erkennung,
Kopfzeilen-Kodierung, Dot-Stuffing) liegen als reine Funktionen mit Tests
vor.

Gegen Microsoft Graph sprach, dass der Versand dann ein lizenziertes Postfach
im eigenen Tenant und eine Anwendungsberechtigung mit Admin-Zustimmung
voraussetzt — mehr Betriebsaufwand als ein SMTP-Zugang, den jeder
Mailanbieter mitbringt.

## Konsequenzen

- Ohne `SMTP_HOST` und `SMTP_FROM` wird nichts verschickt. Die Einstellungen
  sagen das ausdrücklich, statt Erinnerungen still ausfallen zu lassen.
- Es gibt keine Warteschlange: Schlägt der Versand fehl, bleibt die Marke
  ungesetzt, der Fehler landet im Audit-Log und der nächste Lauf versucht es
  erneut.
- Kommen einmal mehr oder andere Mails dazu (Antwortadressen, Anhänge,
  HTML), ist der Punkt gekommen, an dem eine Bibliothek die bessere Wahl ist.
  Die Trennung in Nachricht, Transport und Aufruf macht diesen Tausch klein.
