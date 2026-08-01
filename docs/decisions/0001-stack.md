# 0001 — Next.js statt ASP.NET Core

**Datum:** 01.08.2026
**Status:** angenommen

## Kontext

Die Website wird von einer einzelnen Person nebenbei gepflegt. Nicole arbeitet beruflich
überwiegend mit C# und .NET; eine ASP.NET-Core-API mit separatem React-Frontend wäre
naheliegend gewesen.

## Entscheidung

Ein einziges Deployable auf Basis von Next.js 16 mit TypeScript. Kein separates Backend.

## Begründung

- Zwei Runtimes bedeuten zwei Dependency-Bäume, zwei Security-Update-Zyklen, zwei Build-Stages
  und Authentifizierung über Systemgrenzen hinweg.
- Der Editor (TipTap) läuft ohnehin im Browser. Der Renderer für dieselben Inhalte muss
  serverseitig laufen. Beides im gleichen Typsystem spart dauerhaft Doppelarbeit.
- Server Components erlauben Datenzugriff ohne separate API-Schicht.

## Konsequenzen

- C# spielt in diesem Projekt keine Rolle. Das ist bewusst in Kauf genommen.
- Next.js muss auf Active LTS gehalten werden; die Angriffsfläche wächst mit dem Funktionsumfang.
- Sollte später ein rechenintensiver Dienst nötig werden, kann er als eigener Container
  im selben Container Apps Environment ergänzt werden.
