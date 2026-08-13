#!/bin/sh
# Startet den Next.js-Server, nachdem ausstehende Prisma-Migrationen angewendet
# wurden. Zwei Fallstricke werden hier abgefangen:
#
# 1) Aufwachen der DB: Die serverlose Azure-SQL-Instanz ist beim Container-Start
#    häufig noch pausiert und braucht bis zu ~60 s. Ein einmaliger `migrate deploy`
#    scheitert dann. Deshalb mehrere Versuche mit Wartezeit; der erste Versuch
#    weckt die DB, ein späterer wendet die Migration an.
#
# 2) Blockierte Migrationskette: Die Migration 20260809140000_records_kind_focus
#    wurde einmal in fehlerhafter Fassung ausgeliefert und scheiterte auf der
#    Produktions-DB (SQL-Fehler 207: Spalte im selben Batch referenziert). Sie ist
#    transaktional gekapselt (BEGIN TRAN … ROLLBACK), wurde also sauber zurück-
#    gerollt — Prisma merkt sie sich aber als „failed" und verweigert danach JEDEN
#    weiteren `migrate deploy` (P3009). Dadurch fehlen alle späteren Tabellen und
#    Spalten (Identity, Mission-Material, Publication-Repo, Certification-Status)
#    und die Redaktion sieht leere Listen, obwohl die Daten unversehrt sind.
#    Fix: genau diese eine, sauber zurückgerollte Migration als „rolled back"
#    markieren; der nächste Deploy wendet die korrigierte Fassung an, und die
#    Kette läuft weiter. `migrate resolve --rolled-back` greift NUR, wenn die
#    Migration tatsächlich im Fehlerzustand ist — bei einer bereits angewandten
#    Migration schlägt der Aufruf fehl (und wird hier ignoriert). Der Eingriff ist
#    damit sicher und auf genau diese historisch bekannte Migration begrenzt; eine
#    andere, echte Migrationsfehlermeldung wird nicht verschluckt.
set -u

PRISMA="node node_modules/prisma/build/index.js"
STUCK_MIGRATION="20260809140000_records_kind_focus"
attempt=1
max=12

deploy_once() {
  # Normalfall: einfach anwenden.
  if $PRISMA migrate deploy; then
    return 0
  fi
  # Fehlgeschlagen — die eine bekannte Blockade lösen und erneut versuchen. Der
  # resolve-Aufruf ist ein No-op (Exit != 0, hier ignoriert), wenn die Migration
  # nicht im Fehlerzustand ist oder die DB (noch) nicht erreichbar war.
  if $PRISMA migrate resolve --rolled-back "$STUCK_MIGRATION" >/dev/null 2>&1; then
    echo "Recovered stuck migration $STUCK_MIGRATION (marked rolled back); re-deploying."
    if $PRISMA migrate deploy; then
      return 0
    fi
  fi
  return 1
}

while [ "$attempt" -le "$max" ]; do
  if deploy_once; then
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
