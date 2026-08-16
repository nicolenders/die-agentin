# Markenbilder

## Icons — nicht von Hand ändern

Die Dateien `mark-*.png`, `icon-tile-*.png`, `icon-maskable-512.png`,
`apple-touch-icon.png` und `../favicon.ico` werden **erzeugt**, nicht gepflegt.
Quelle ist das Logo-Kit unter `docs/die-agentin-logo-kit`. Nach einem neuen Kit:

```bash
node scripts/brand-icons.mjs
```

Wo welche Fassung erscheint, steht in `lib/brand.ts`.

## Fotos

Lege hier deine generierten Markenbilder ab. Sobald eine Datei existiert, zeigt
die Website sie automatisch — sonst erscheint ein gestalteter Platzhalter.

| Datei | Wo sie erscheint | Format |
|---|---|---|
| `hero.jpg` | Startseite (HQ), Hero | Hochformat 4:5 |
| `portrait.jpg` | „Legende" (Über mich) | Hochformat 4:5 |
| `cover-<Publikations-ID>.jpg` | Publikationen, Buchcover | Hochformat 2:3 |

Erlaubte Endungen: `.jpg`, `.png`, `.webp`, `.avif` (der Dateiname ohne Endung
zählt).

Die passenden ChatGPT-Prompts stehen in `docs/BILDPROMPTS.md`.
