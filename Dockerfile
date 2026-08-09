# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Mehrstufiger Build für Next.js 16 (standalone output). Ergebnis ist ein
# schlankes Runtime-Image für Azure Container Apps (SPEC §14).
# ---------------------------------------------------------------------------

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# openssl wird von Prisma benötigt; ca-certificates für die TLS-Prüfung der
# Azure-SQL-Verbindung (encrypt=true, trustServerCertificate=false).
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Abhängigkeiten ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone-Ausgabe (next.config output: "standalone")
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma-Engine, -Schema und -CLI für Runtime-Queries + `migrate deploy` beim
# Start. `@prisma` enthält die Client- und Engine-Pakete (inkl. @prisma/engines
# mit der schema-engine für Migrationen), `prisma` die CLI.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# Scheduler-Skripte für den Container Apps Job (Cron-Tick)
COPY --from=builder /app/scripts ./scripts

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# Ausstehende Migrationen beim Start anwenden, dann Server starten. Migrationen
# sind idempotent (migrate deploy); schlägt es fehl (z. B. DB kurz nicht
# erreichbar), startet der Server trotzdem und der nächste Start versucht es
# erneut — so bleibt die Seite erreichbar, statt in einer Boot-Schleife zu hängen.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy || echo 'WARN: prisma migrate deploy failed — starting server anyway'; node server.js"]
