// Secret-Ablage (SPEC §13). Zugriffstokens gehören NICHT in Repository, DB oder
// Logs. In der DB steht nur eine Referenz (`ChannelAccount.tokenRef`) und das
// Ablaufdatum.
//
// Produktiv: Azure Key Vault, eingebunden über die User-Assigned Managed
// Identity der Container App (benötigt @azure/keyvault-secrets — offener Punkt,
// siehe docs/decisions/0006-channels-secrets.md).
//
// Entwicklung: flüchtiger In-Memory-Speicher. Tokens überleben keinen Neustart;
// die Verbindung muss dann neu autorisiert werden. Bewusst NICHT auf Platte, um
// keine Klartext-Secrets zu hinterlegen.

const memory = new Map<string, string>();

export function isKeyVaultConfigured(): boolean {
  return Boolean(process.env.KEY_VAULT_NAME);
}

export async function setSecret(name: string, value: string): Promise<void> {
  if (isKeyVaultConfigured()) {
    throw new Error(
      "Key-Vault-Anbindung ist noch nicht implementiert (docs/decisions/0006-channels-secrets.md).",
    );
  }
  memory.set(name, value);
}

export async function getSecret(name: string): Promise<string | null> {
  if (isKeyVaultConfigured()) {
    throw new Error(
      "Key-Vault-Anbindung ist noch nicht implementiert (docs/decisions/0006-channels-secrets.md).",
    );
  }
  return memory.get(name) ?? null;
}

export async function deleteSecret(name: string): Promise<void> {
  if (!isKeyVaultConfigured()) memory.delete(name);
}
