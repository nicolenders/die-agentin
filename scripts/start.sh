#!/bin/sh
# Startet den Next.js-Server, nachdem ausstehende Prisma-Migrationen angewendet
# wurden. Die serverlose Azure-SQL-Instanz ist beim Container-Start häufig noch
# pausiert und braucht bis zu ~60 s zum Aufwachen. Ein einmaliger
# `migrate deploy` scheitert dann — mit der Folge, dass Spalten/Tabellen fehlen
# und öffentliche Abfragen ins Leere laufen (z. B. keine Publikationen sichtbar).
# Deshalb hier mehrere Versuche mit Wartezeit; der erste Verbindungsversuch weckt
# die DB, ein späterer Versuch wendet die Migration dann an.
set -u

PRISMA="node node_modules/prisma/build/index.js"
attempt=1
max=12

while [ "$attempt" -le "$max" ]; do
  if $PRISMA migrate deploy; then
    echo "Prisma migrations applied (attempt $attempt)."
    break
  fi
  if [ "$attempt" -eq "$max" ]; then
    echo "WARN: 'prisma migrate deploy' failed after $attempt attempts — starting server anyway."
    break
  fi
  echo "migrate deploy failed (attempt $attempt/$max) — database may be waking; retrying in 6s"
  attempt=$((attempt + 1))
  sleep 6
done

exec node server.js
