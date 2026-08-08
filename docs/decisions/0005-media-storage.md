# 0005 — Medienablage: lokal jetzt, Blob später

**Datum:** 01.08.2026 · **Blob-Upload umgesetzt:** 09.08.2026
**Status:** angenommen (lokal **und** Blob)

## Kontext

M2 verlangt eine Medienbibliothek mit Upload, Alt-Text-Pflicht und
Bildvarianten (sharp). Produktiv liegen Medien in Azure Blob Storage
(Container `media`, öffentlich lesend; SPEC §14). Der Upload nach Blob
benötigt das SDK `@azure/storage-blob` — eine Abhängigkeit außerhalb des in
CLAUDE.md gelisteten Stacks — und Managed Identity.

## Entscheidung

- **Verarbeitung** (Magic-Byte-Prüfung, EXIF/GPS entfernen, WebP-Varianten) ist
  vollständig umgesetzt (`lib/media/*`), speicheragnostisch.
- **Ablage lokal**: Dateien unter `public/uploads/` (von Next ausgeliefert),
  damit der Upload-Fluss ohne Azure lauffähig und testbar ist.
- **Ablage in Blob**: bewusst noch nicht implementiert. `storeFile` wirft bei
  gesetztem `BLOB_ACCOUNT_NAME` einen klaren Fehler, statt ein halbes Verhalten
  vorzutäuschen.

## Nachtrag 09.08.2026 — Blob-Upload umgesetzt

Nach Freigabe wurde der Blob-Upload ergänzt (der zuvor offene Punkt):

- Abhängigkeiten: `@azure/storage-blob` + `@azure/identity` aufgenommen.
- `storeFile` lädt bei gesetztem `BLOB_ACCOUNT_NAME` in den `media`-Container
  (Blob-Name = Variantenpfad), sonst weiterhin nach `public/uploads/`.
- Authentifizierung per `DefaultAzureCredential` mit der user-assigned Managed
  Identity (`AZURE_CLIENT_ID`) — kein Secret im Code. Rolle „Storage Blob Data
  Contributor" und Env-Vars kommen aus `infra/main.bicep`.
- Uploads erhalten `Cache-Control: public, max-age=31536000, immutable`
  (Dateiname enthält die Asset-ID, Inhalt ist unveränderlich).

## Konsequenz

- Lokal/Docker: Upload nach `public/uploads/`, funktioniert ohne Azure.
- Produktiv: Upload nach Azure Blob über Managed Identity, keine Secrets.
