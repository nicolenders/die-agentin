import { describe, expect, it } from "vitest";
import { isFinalReplyLine, isPositive, parseReply, supportsStartTls } from "./smtp";

describe("isFinalReplyLine", () => {
  it("erkennt die Abschlusszeile", () => {
    expect(isFinalReplyLine("250 OK")).toBe(true);
    expect(isFinalReplyLine("250")).toBe(true);
  });

  it("erkennt Fortsetzungszeilen nicht als Abschluss", () => {
    expect(isFinalReplyLine("250-STARTTLS")).toBe(false);
    expect(isFinalReplyLine("STARTTLS")).toBe(false);
  });
});

describe("parseReply", () => {
  it("nimmt den Code aus der letzten Zeile", () => {
    expect(parseReply(["250-mail.example.com", "250 OK"]).code).toBe(250);
  });

  it("meldet 0, wenn kein Code lesbar ist", () => {
    expect(parseReply(["kaputt"]).code).toBe(0);
  });
});

describe("isPositive", () => {
  it("wertet 2xx und 3xx als Erfolg", () => {
    expect(isPositive(250)).toBe(true);
    expect(isPositive(354)).toBe(true);
    expect(isPositive(535)).toBe(false);
    expect(isPositive(0)).toBe(false);
  });
});

describe("supportsStartTls", () => {
  it("findet die Fähigkeit in der EHLO-Antwort", () => {
    expect(supportsStartTls(["250-mail.example.com", "250-STARTTLS", "250 SIZE"])).toBe(true);
  });

  it("meldet sie nicht, wenn sie fehlt", () => {
    expect(supportsStartTls(["250-mail.example.com", "250 SIZE"])).toBe(false);
  });
});
