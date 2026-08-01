// ---------------------------------------------------------------------------
// nicolenders.com — Azure-Infrastruktur (SPEC §14).
// Ein Deployment pro Umgebung. NICHT in dieser Sitzung ausgeführt — mit
// `az deployment group what-if` gegen eine echte Subscription zu verifizieren.
//
// Secrets kommen ausschließlich aus dem Key Vault (SPEC §13); hier werden nur
// Referenzen verdrahtet, keine Werte gesetzt.
// ---------------------------------------------------------------------------

targetScope = 'resourceGroup'

@description('Kurzer Umgebungsname, z. B. prod oder staging.')
param environmentName string = 'prod'

@description('Azure-Region. Empfohlen: germanywestcentral oder westeurope.')
param location string = resourceGroup().location

@description('Basisname für Ressourcen.')
param baseName string = 'nicolenders'

@description('Container-Image inkl. Tag (Git-SHA), z. B. <acr>.azurecr.io/web:<sha>.')
param containerImage string

@description('Custom Domain (Apex).')
param customDomain string = 'nicolenders.com'

@description('Öffentliche Site-URL.')
param siteUrl string = 'https://nicolenders.com'

@description('Entra Object IDs mit Admin-Zugriff, kommasepariert.')
param adminObjectIds string = ''

@description('Monatliches Budget in EUR für den Kostenalarm.')
param monthlyBudget int = 25

@description('E-Mail für Budget-Benachrichtigungen.')
param budgetContactEmail string

var tags = {
  app: baseName
  env: environmentName
}
var suffix = uniqueString(resourceGroup().id, environmentName)

// ---- Managed Identity ------------------------------------------------------
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-${environmentName}-id'
  location: location
  tags: tags
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

// ---- Container Registry -----------------------------------------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: replace('${baseName}${environmentName}acr${suffix}', '-', '')
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

// Identity darf aus der Registry ziehen (AcrPull).
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, identity.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

// ---- Key Vault -------------------------------------------------------------
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${baseName}-${environmentName}-kv-${take(suffix, 6)}'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
  }
}

// Identity darf Secrets lesen (Key Vault Secrets User).
resource kvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, identity.id, 'KeyVaultSecretsUser')
  scope: vault
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

// ---- Storage (Medien) ------------------------------------------------------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: replace('${baseName}${environmentName}st${suffix}', '-', '')
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

// Identity darf Blobs schreiben (Storage Blob Data Contributor).
resource blobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'BlobContributor')
  scope: storage
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

// ---- Azure SQL (Free Offer, serverless, auto-pause) ------------------------
resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: '${baseName}-${environmentName}-sql-${take(suffix, 6)}'
  location: location
  tags: tags
  properties: {
    version: '12.0'
    // Ausschließlich Entra-Authentifizierung (SPEC §3.2). Der SQL-Admin ist die
    // Managed Identity bzw. eine Entra-Gruppe.
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Application'
      login: identity.name
      sid: identity.properties.principalId
      tenantId: subscription().tenantId
      azureADOnlyAuthentication: true
    }
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: '${baseName}db'
  location: location
  tags: tags
  sku: { name: 'GP_S_Gen5_1', tier: 'GeneralPurpose' }
  properties: {
    // Free Offer: begrenzte vCore-Sekunden, danach auto-pause statt Kosten
    // (SPEC §14 Kostenbremse).
    autoPauseDelay: 60
    minCapacity: json('0.5')
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

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

var jobSharedSecretRef = 'job-shared-secret'
var databaseUrlRef = 'database-url'

// ---- Web Container App ------------------------------------------------------
resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${baseName}-${environmentName}-web'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      activeRevisionsMode: 'Multiple' // Rollback = Traffic-Switch (SPEC §15)
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        customDomains: [
          {
            name: customDomain
            bindingType: 'SniEnabled'
            certificateId: managedCert.id
          }
        ]
      }
      registries: [
        { server: acr.properties.loginServer, identity: identity.id }
      ]
      secrets: [
        { name: databaseUrlRef, keyVaultUrl: '${vault.properties.vaultUri}secrets/${databaseUrlRef}', identity: identity.id }
        { name: jobSharedSecretRef, keyVaultUrl: '${vault.properties.vaultUri}secrets/${jobSharedSecretRef}', identity: identity.id }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'NEXT_PUBLIC_SITE_URL', value: siteUrl }
            { name: 'DATABASE_URL', secretRef: databaseUrlRef }
            { name: 'JOB_SHARED_SECRET', secretRef: jobSharedSecretRef }
            { name: 'ADMIN_OBJECT_IDS', value: adminObjectIds }
            { name: 'BLOB_ACCOUNT_NAME', value: storage.name }
            { name: 'BLOB_CONTAINER_MEDIA', value: 'media' }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 } // min 1 gegen Kaltstart (SPEC §14)
    }
  }
}

// ---- Managed Certificate (kostenfrei) --------------------------------------
resource managedCert 'Microsoft.App/managedEnvironments/managedCertificates@2024-03-01' = {
  parent: caEnv
  name: '${baseName}-cert'
  location: location
  properties: {
    subjectName: customDomain
    domainControlValidation: 'CNAME'
  }
}

// ---- Scheduler Job (Cron alle 5 Min.) --------------------------------------
resource schedulerJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${baseName}-${environmentName}-scheduler'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
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
      registries: [
        { server: acr.properties.loginServer, identity: identity.id }
      ]
      secrets: [
        { name: jobSharedSecretRef, keyVaultUrl: '${vault.properties.vaultUri}secrets/${jobSharedSecretRef}', identity: identity.id }
      ]
    }
    template: {
      containers: [
        {
          name: 'scheduler'
          image: containerImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          command: ['node', 'scripts/scheduler.mjs']
          env: [
            { name: 'NEXT_PUBLIC_SITE_URL', value: siteUrl }
            { name: 'JOB_SHARED_SECRET', secretRef: jobSharedSecretRef }
          ]
        }
      ]
    }
  }
}

// ---- Budget-Alert (Kostenbremse, SPEC §14) ---------------------------------
resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: '${baseName}-${environmentName}-budget'
  properties: {
    category: 'Cost'
    amount: monthlyBudget
    timeGrain: 'Monthly'
    timePeriod: { startDate: '2026-08-01' }
    notifications: {
      Actual80: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 80
        contactEmails: [budgetContactEmail]
        thresholdType: 'Actual'
      }
      Forecast100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        contactEmails: [budgetContactEmail]
        thresholdType: 'Forecasted'
      }
    }
  }
}

output webFqdn string = web.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output identityClientId string = identity.properties.clientId
output vaultUri string = vault.properties.vaultUri
