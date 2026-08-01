# 0005 — Medienablage: lokal jetzt, Blob später

**Datum:** 01.08.2026
**Status:** angenommen (lokal), Blob-Upload **offen**

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

## Offener Punkt (Rückfrage vor Umsetzung)

`@azure/storage-blob` als Abhängigkeit aufnehmen? Dann `storeFile` um den
Blob-Upload (Container `media`) via Managed Identity ergänzen. Bis zur Freigabe
bleibt es beim lokalen Pfad. Die öffentliche URL-Bildung (`assetUrl`) ist bereits
Blob-fähig.

## Konsequenz

- Lokal/Docker: Upload funktioniert sofort.
- Produktiv: ein klar abgegrenzter Folgeschritt (eine Datei, eine Abhängigkeit).
