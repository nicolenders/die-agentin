# Infrastruktur (Bicep)

Alle Azure-Ressourcen für nicolenders.com als Bicep (SPEC §14). **In dieser
Umsetzung geschrieben, aber nicht deployt** — vor dem ersten Rollout mit
`what-if` gegen eine echte Subscription zu verifizieren.

## Ressourcen (`main.bicep`)

- User-Assigned Managed Identity (Zugriff auf Key Vault, Blob, ACR, SQL)
- Log Analytics (30 Tage, Cap 1 GB/Monat)
- Container Registry (Basic)
- Key Vault (RBAC, Soft-Delete) — einzige Secret-Quelle
- Storage Account (Container `media` öffentlich, `uploads` privat)
- Azure SQL (Free Offer, serverless, `AutoPause` bei Erreichen des Frei-Kontingents)
- Container Apps Environment
- Container App `web` (0,25 vCPU / 0,5 GiB, min 1 / max 3, Multiple-Revisions
  für Traffic-Split-Rollback), Custom Domain + Managed Certificate
- Container Apps Job `scheduler` (Cron alle 5 Minuten)
- Budget-Alert (Kostenbremse)

## Verifizieren (nicht ausführen ohne Freigabe)

```bash
az deployment group what-if \
  --resource-group <rg> \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

## Offene Punkte vor dem ersten Deployment

- Entra-App-Registrierung (Client-ID/-Secret/-Issuer) und `ADMIN_OBJECT_IDS`.
- Key-Vault-Secrets `database-url` und `job-shared-secret` befüllen.
- Custom-Domain-Validierung (CNAME) für das Managed Certificate.
- DB-Auth (Managed Identity vs. Fallback) — siehe `docs/decisions/0002-db-auth.md`.
- Bicep ist nicht gegen echte API-Versionen validiert (kein Azure-Zugang in der
  Umsetzungsumgebung) — `what-if` vor dem Deployment ist Pflicht.
