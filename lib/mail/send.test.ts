import { describe, expect, it } from "vitest";
import { readMailConfig } from "./send";

describe("readMailConfig", () => {
  it("meldet fehlende Einrichtung mit einem Satz, der sagt, was zu tun ist", () => {
    const result = readMailConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("SMTP_HOST");
  });

  it("nimmt Port 587 und STARTTLS als Standard", () => {
    const result = readMailConfig({ SMTP_HOST: "mail.example.com", SMTP_FROM: "post@example.com" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.port).toBe(587);
      expect(result.config.secure).toBe(false);
    }
  });

  it("schaltet bei Port 465 automatisch auf verschlüsselte Verbindung", () => {
    const result = readMailConfig({
      SMTP_HOST: "mail.example.com",
      SMTP_FROM: "post@example.com",
      SMTP_PORT: "465",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.secure).toBe(true);
  });

  it("übernimmt Zugangsdaten, wenn sie gesetzt sind", () => {
    const result = readMailConfig({
      SMTP_HOST: "mail.example.com",
      SMTP_FROM: "post@example.com",
      SMTP_USER: "agentin",
      SMTP_PASSWORD: "geheim",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.user).toBe("agentin");
  });
});
