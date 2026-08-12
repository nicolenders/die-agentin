# data/import/

Quelldateien für den Backfill-Importer (Phase 8). Ablegen als
`missions.json` und/oder `briefings.json` im Schema aus `docs/IMPORT.md`.

`.gitignore` schließt die echten Exporte aus (keine personenbezogenen
Rohdaten im Repo); nur diese README ist eingecheckt.

Lauf:  npm run db:import -- --dry-run   (Trockenlauf)
        npm run db:import               (echt)
