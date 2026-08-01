# 0006 — Kanal-Tokens und Secret-Ablage

**Datum:** 01.08.2026
**Status:** angenommen (Struktur), Key-Vault-Anbindung + echter Versand **offen**

## Kontext

M7 verlangt LinkedIn-OAuth mit automatischem Versand sowie eine Ein-Klick-
Freigabe für die übrigen Kanäle. Zugriffstokens dürfen nicht ins Repository, in
die DB oder in Logs (SPEC §13). In der DB steht nur eine Referenz
(`ChannelAccount.tokenRef`) und das Ablaufdatum.

## Entscheidung

- **OAuth-Fluss, Token-Austausch und LinkedIn-Post** sind vollständig
  implementiert (`lib/channels/linkedin.ts`, OAuth-Routen). Der Versand läuft
  über die Kanal-Aufgaben mit drei Versuchen und exponentiellem Backoff
  (`lib/channels/process.ts`); ohne gültige Verbindung fällt der Task auf
  MANUAL_OPEN zurück.
- **Secret-Ablage** (`lib/secrets.ts`): produktiv Azure Key Vault über Managed
  Identity — benötigt `@azure/keyvault-secrets` (Abhängigkeit außerhalb des in
  CLAUDE.md gelisteten Stacks, **Rückfrage nötig**). In der Entwicklung ein
  **flüchtiger In-Memory-Speicher** (kein Klartext-Secret auf Platte, keins im
  Repo). Tokens überleben keinen Neustart; die Verbindung wird dann neu
  autorisiert.

## Offene Punkte (zu verifizieren / freizugeben)

1. `@azure/keyvault-secrets` aufnehmen und `lib/secrets.ts` um die Key-Vault-
   Implementierung ergänzen.
2. Echte LinkedIn-App (mit LinkedIn-Seite als Eigentümerin, SPEC §19.3) für den
   OAuth-Fluss und den tatsächlichen Versand. Bis dahin ist der Post-Pfad
   strukturell vorhanden, aber nicht praktisch verifiziert.

## Konsequenz

- Ohne Konfiguration verhält sich die Anwendung ehrlich: LinkedIn-Tasks werden
  zu Ein-Klick-Aufgaben, statt einen Versand vorzutäuschen.
- Der Umstieg auf Key Vault + echte App ist ein abgegrenzter Folgeschritt.
