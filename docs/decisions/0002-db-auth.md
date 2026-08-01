# 0002 — Authentifizierung gegen Azure SQL

**Datum:** 01.08.2026
**Status:** angenommen (Fallback), Managed-Identity-Pfad **zu verifizieren**

## Kontext

Ziel ist passwortloser Zugriff auf die Azure-SQL-Datenbank über eine
User-Assigned Managed Identity der Container App. Ob der Prisma-`sqlserver`-
Connector Token-Authentifizierung in der benötigten Form unterstützt, war vor
M1 praktisch zu prüfen (SPEC §3.2).

## Prüfung

Ein echter Azure-Zugang stand in dieser Umgebung **nicht** zur Verfügung. Der
praktische Verbindungstest gegen eine Azure-SQL-Datenbank mit ausschließlicher
Entra-Authentifizierung konnte daher nicht durchgeführt werden.

Sachstand aus der Dokumentation: Prisma spricht SQL Server über den
Microsoft-`tedious`-Treiber an. `tedious` unterstützt token-basierte
Authentifizierung (`authentication.type = "azure-active-directory-*"`), aber
der Prisma-Connector nimmt seine Verbindungsparameter über die
`DATABASE_URL`-Zeichenkette entgegen und reicht ein extern besorgtes AAD-Token
nicht ohne Weiteres durch. Ein token-basierter Zugriff mit periodischer
Erneuerung (Ablauf ~1 h) und sauberem Reconnect ist damit **nicht als gesichert**
anzunehmen und muss an echter Infrastruktur verifiziert werden.

## Entscheidung (umgesetzt)

**Fallback-Variante:** SQL-Authentifizierung mit einem Passwort, das
ausschließlich im Key Vault liegt und über eine Container-Apps-Secret-Referenz
als `DATABASE_URL` eingebunden wird. Kein Passwort im Repository, in
Pipeline-Variablen oder im Container-Image.

- Lokal: SQL Server im Container (`docker compose`), Passwort nur für die lokale
  Entwicklung (siehe `docker-compose.yml`).
- Produktiv: `DATABASE_URL` als Secret-Referenz auf ein Key-Vault-Secret; die
  Container App liest es über ihre User-Assigned Managed Identity (die Identity
  authentifiziert also gegen den **Key Vault**, nicht gegen SQL). Verbindung mit
  `encrypt=true` und erhöhtem `connect_timeout` (SPEC §2.1).

## Zu verifizieren (mit echtem Azure-Zugang)

1. Verbindungsaufbau mit Managed Identity gegen eine Azure-SQL-DB mit
   ausschließlicher Entra-Authentifizierung (Prisma + `tedious`).
2. Verhalten beim Token-Ablauf im laufenden Betrieb (Reconnect).
3. Verhalten beim Aufwachen der pausierten Serverless-DB (Retry, Timeout).

Fällt (1) positiv aus, wird auf die passwortlose Variante umgestellt; das ist
ein reiner Wechsel der `DATABASE_URL`-Konfiguration plus SQL-seitiger
`CREATE USER ... FROM EXTERNAL PROVIDER`, kein Code-Umbau.

## Konsequenz

Der Code ist connector-agnostisch: Es wird nirgends ein Passwort oder Token im
Code gehalten; einzig `DATABASE_URL` (eine Secret-Referenz) steuert den Zugang.
Der Umstieg auf Managed Identity ist ein Infrastruktur-/Konfigurationsschritt.
