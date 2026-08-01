# 0002 — Authentifizierung gegen Azure SQL

**Datum:** offen
**Status:** offen — vor Meilenstein M1 zu entscheiden

## Kontext

Ziel ist passwortloser Zugriff auf die Azure-SQL-Datenbank über eine User-Assigned Managed
Identity der Container App. Ob der Prisma-SQL-Server-Connector Token-Authentifizierung in der
benötigten Form unterstützt, ist nicht verifiziert.

## Zu prüfen

1. Verbindungsaufbau mit Managed Identity gegen eine Azure-SQL-Datenbank mit
   ausschließlicher Entra-Authentifizierung.
2. Verhalten beim Token-Ablauf im laufenden Betrieb (Reconnect).
3. Verhalten beim Aufwachen der pausierten Serverless-Datenbank.

## Fallback

SQL-Authentifizierung mit einem Passwort, das ausschließlich im Key Vault liegt und über eine
Container-Apps-Secret-Referenz eingebunden wird. Kein Passwort im Repository, in Pipeline-Variablen
oder im Container-Image.

## Ergebnis

_Nach dem Test ausfüllen: gewählte Variante, Datum, kurze Begründung._
