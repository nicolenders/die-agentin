// ---------------------------------------------------------------------------
// nicolenders.com — Azure-Infrastruktur (SPEC §14).
//
// Ziel: EIN Bicep-Deployment, das nach dem Bootstrap der Container Registry
// alles Übrige idempotent anlegt und aktualisiert. Bewusst einfach gehalten,
// damit der Erstaufbau direkt durchläuft (siehe infra/README.md).
//
// DB-Zugriff: SQL-Authentifizierung (ADR 0002, Fallback). Das Passwort kommt
// als sicherer Parameter beim Deployment (GitHub-Secret / Key Vault) und
// landet ausschließlich als Container-App-Secret — nie im Repository.
//
// Custom Domain wird bewusst NICHT hier verdrahtet (erfordert DNS-Validierung
// und würde den ersten Lauf blockieren) — siehe infra/README.md, Abschnitt
// „Optional: eigene Domain".
// ---------------------------------------------------------------------------

targetScope = 'resourceGroup'

@description('Azure-Region. Empfohlen: germanywestcentral oder westeurope.')
param location string = resourceGroup().location

@description('Basisname für Ressourcen.')
param baseName string = 'nicolenders'

@description('Kurzer Umgebungsname, z. B. prod.')
param environmentName string = 'prod'

@description('Name der zuvor angelegten Container Registry (global eindeutig, nur Kleinbuchstaben/Ziffern).')
param acrName string

@description('Voller Image-Name inkl. Tag, z. B. <acr>.azurecr.io/web:<tag>.')
param containerImage string

@description('Öffentliche Site-URL. Nach dem ersten Deployment auf die ausgegebene webUrl (oder eigene Domain) setzen.')
param siteUrl string = ''

@description('''Kanonischer Hostname OHNE Schema, z. B. "nicolenders.com". Steuert zwei
Dinge in der App: die canonical-/OG-Basis der Metadaten und die noindex-Entscheidung
in proxy.ts — jeder andere Host bekommt X-Robots-Tag: noindex, nofollow.
Leer lassen, solange die eigene Domain noch nicht auf der Container App liegt:
dann leitet die App den Host aus siteUrl ab (bisheriges Verhalten).''')
param publicSiteHost string = ''

// --- Secrets (sichere Parameter) --------------------------------------------
@description('SQL-Admin-Login.')
param sqlAdminLogin string = 'nicoleadmin'

@secure()
@description('SQL-Admin-Passwort. Mindestens 12 Zeichen, KEIN Semikolon.')
param sqlAdminPassword string

@secure()
@description('Auth.js-Secret (npx auth secret).')
param authSecret string

@secure()
@description('Shared Secret für den Job-Endpunkt.')
param jobSharedSecret string

// --- Optionale Konfiguration -------------------------------------------------
@description('Entra Object IDs mit Admin-Zugriff, kommasepariert.')
param adminObjectIds string = ''

param entraClientId string = ''
@secure()
param entraClientSecret string = ''
param entraIssuer string = ''

param linkedinClientId string = ''
@secure()
param linkedinClientSecret string = ''

// Mailversand für die Erinnerung an Depeschen (ADR 0023). Leer = kein Versand;
// die Einstellungen weisen dann darauf hin, statt still zu scheitern.
@description('SMTP-Server für die Erinnerungsmail. Leer = kein Mailversand.')
param smtpHost string = ''
@description('SMTP-Port. 587 = STARTTLS, 465 = direkt verschlüsselt.')
param smtpPort string = '587'
@description('Absender, z. B. "Die Agentin <zentrale@nicolenders.com>".')
param smtpFrom string = ''
param smtpUser string = ''
@secure()
param smtpPassword string = ''

// --- Kostenbremse ------------------------------------------------------------
@description('E-Mail für den Budget-Alarm. Leer = kein Budget-Alarm.')
param budgetContactEmail string = ''
@description('Monatliches Budget in EUR.')
param monthlyBudget int = 25
@description('Erster Tag des Budget-Monats (YYYY-MM-01).')
param budgetStartDate string = '2026-08-01'

var tags = { app: baseName, env: environmentName }
var suffix = uniqueString(resourceGroup().id, environmentName)
var dbName = '${baseName}db'
var appName = '${baseName}-${environmentName}-web'
var databaseUrl = 'sqlserver://${sqlServer.properties.fullyQualifiedDomainName}:1433;database=${dbName};user=${sqlAdminLogin};password=${sqlAdminPassword};encrypt=true;trustServerCertificate=false'

// ---- Managed Identity (für ACR-Pull) ---------------------------------------
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-${environmentName}-id'
  location: location
  tags: tags
}

// ---- Container Registry (zuvor per CLI gebootstrappt) -----------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, identity.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

// ---- Log Analytics ---------------------------------------------------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${baseName}-${environmentName}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}

// ---- Storage (Medien) ------------------------------------------------------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  // Storage-Kontonamen: 3–24 Zeichen, nur Kleinbuchstaben/Ziffern.
  name: toLower(take('${baseName}${environmentName}st${suffix}', 24))
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blob 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blob
  name: 'media'
  properties: { publicAccess: 'Blob' }
}
resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blob
  name: 'uploads'
  properties: { publicAccess: 'None' }
}
resource blobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'BlobContributor')
  scope: storage
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

// ---- Azure SQL (Free Offer, serverless, SQL-Auth) --------------------------
resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: '${baseName}-${environmentName}-sql-${take(suffix, 6)}'
  location: location
  tags: tags
  properties: {
    version: '12.0'
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: dbName
  location: location
  tags: tags
  sku: { name: 'GP_S_Gen5_1', tier: 'GeneralPurpose' }
  properties: {
    autoPauseDelay: 60
    minCapacity: json('0.5')
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

// Erlaubt Azure-Diensten (u. a. der Container App) den Zugriff.
resource sqlFirewallAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

// ---- Container Apps Environment --------------------------------------------
resource caEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${baseName}-${environmentName}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

var commonSecrets = [
  { name: 'database-url', value: databaseUrl }
  { name: 'auth-secret', value: authSecret }
  { name: 'job-shared-secret', value: jobSharedSecret }
  { name: 'entra-secret', value: empty(entraClientSecret) ? 'unused' : entraClientSecret }
  { name: 'linkedin-secret', value: empty(linkedinClientSecret) ? 'unused' : linkedinClientSecret }
  { name: 'smtp-password', value: empty(smtpPassword) ? 'unused' : smtpPassword }
]

// ---- Web Container App ------------------------------------------------------
resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  // Sicherstellen, dass die AcrPull-Rolle existiert, bevor das Image gezogen wird.
  dependsOn: [ acrPull ]
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      // Multiple-Revisions für Rollback per Traffic-Switch; die jeweils neueste
      // Revision erhält automatisch 100 % Traffic (SPEC §15).
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        traffic: [ { latestRevision: true, weight: 100 } ]
      }
      registries: [ { server: acr.properties.loginServer, identity: identity.id } ]
      secrets: commonSecrets
    }
    template: {
      // Kein expliziter revisionSuffix — Container Apps erzeugt bei Image-
      // Änderung automatisch eine neue Revision.
      containers: [
        {
          name: 'web'
          image: containerImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'NEXT_PUBLIC_SITE_URL', value: siteUrl }
            { name: 'PUBLIC_SITE_HOST', value: publicSiteHost }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'AUTH_SECRET', secretRef: 'auth-secret' }
            { name: 'JOB_SHARED_SECRET', secretRef: 'job-shared-secret' }
            { name: 'ADMIN_OBJECT_IDS', value: adminObjectIds }
            { name: 'AUTH_MICROSOFT_ENTRA_ID_ID', value: entraClientId }
            { name: 'AUTH_MICROSOFT_ENTRA_ID_SECRET', secretRef: 'entra-secret' }
            { name: 'AUTH_MICROSOFT_ENTRA_ID_ISSUER', value: entraIssuer }
            { name: 'LINKEDIN_CLIENT_ID', value: linkedinClientId }
            { name: 'LINKEDIN_CLIENT_SECRET', secretRef: 'linkedin-secret' }
            { name: 'BLOB_ACCOUNT_NAME', value: storage.name }
            { name: 'BLOB_CONTAINER_MEDIA', value: 'media' }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
            { name: 'SMTP_HOST', value: smtpHost }
            { name: 'SMTP_PORT', value: smtpPort }
            { name: 'SMTP_FROM', value: smtpFrom }
            { name: 'SMTP_USER', value: smtpUser }
            { name: 'SMTP_PASSWORD', secretRef: 'smtp-password' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 } // min 1 gegen Kaltstart (SPEC §14)
    }
  }
}

// ---- Scheduler Job (Cron alle 5 Minuten) -----------------------------------
resource schedulerJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${baseName}-${environmentName}-scheduler'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  dependsOn: [ acrPull ]
  properties: {
    environmentId: caEnv.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 120
      scheduleTriggerConfig: {
        cronExpression: '*/5 * * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [ { server: acr.properties.loginServer, identity: identity.id } ]
      secrets: [ { name: 'job-shared-secret', value: jobSharedSecret } ]
    }
    template: {
      containers: [
        {
          name: 'scheduler'
          image: containerImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          command: [ 'node', 'scripts/job-once.mjs' ] // einmaliger Tick, dann Exit
          env: [
            { name: 'NEXT_PUBLIC_SITE_URL', value: siteUrl }
            { name: 'JOB_SHARED_SECRET', secretRef: 'job-shared-secret' }
          ]
        }
      ]
    }
  }
}

// ---- Budget-Alarm (nur wenn E-Mail gesetzt) --------------------------------
resource budget 'Microsoft.Consumption/budgets@2023-11-01' = if (!empty(budgetContactEmail)) {
  name: '${baseName}-${environmentName}-budget'
  properties: {
    category: 'Cost'
    amount: monthlyBudget
    timeGrain: 'Monthly'
    timePeriod: { startDate: budgetStartDate }
    notifications: {
      Actual80: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 80
        contactEmails: [ budgetContactEmail ]
        thresholdType: 'Actual'
      }
      Forecast100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        contactEmails: [ budgetContactEmail ]
        thresholdType: 'Forecasted'
      }
    }
  }
}

output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
output webFqdn string = web.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = dbName
output identityClientId string = identity.properties.clientId
