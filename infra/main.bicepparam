using './main.bicep'

// Beispiel-Parameter. KEINE Secrets hier — die kommen aus dem Key Vault.
param environmentName = 'prod'
param location = 'germanywestcentral'
param baseName = 'nicolenders'
param containerImage = '<acr-login-server>/web:<git-sha>'
param customDomain = 'nicolenders.com'
param siteUrl = 'https://nicolenders.com'
param adminObjectIds = '<entra-object-id>'
param monthlyBudget = 25
param budgetContactEmail = 'nicole@example.org'
