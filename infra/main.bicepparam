using './main.bicep'

// Beispiel-Parameter für ein manuelles Deployment (die Pipeline übergibt die
// Werte selbst). KEINE echten Secrets hier committen — beim manuellen Deploy
// über die Kommandozeile übergeben (siehe infra/README.md).

param location = 'germanywestcentral'
param baseName = 'nicolenders'
param environmentName = 'prod'

// Muss vor dem Deployment existieren (az acr create) und global eindeutig sein.
param acrName = 'nicolendersacr'
param containerImage = 'nicolendersacr.azurecr.io/web:latest'

// Nach dem ersten Deployment auf die ausgegebene webUrl setzen.
param siteUrl = ''

// Kanonischer Hostname ohne Schema, z. B. 'nicolenders.com'. Erst setzen, wenn
// die Domain auf der Container App gebunden ist — sonst bekommt die erreichbare
// URL ein noindex. Leer = Host wird aus siteUrl abgeleitet.
param publicSiteHost = ''

// Secrets: beim Aufruf per --parameters überschreiben, nicht hier eintragen.
param sqlAdminPassword = ''
param authSecret = ''
param jobSharedSecret = ''

// Optional
param adminObjectIds = ''
param budgetContactEmail = ''
