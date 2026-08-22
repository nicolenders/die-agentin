import { describe, expect, it } from "vitest";
import { addressOnly, buildMessage, chunkBase64, dotStuff, encodeHeaderValue } from "./message";

describe("encodeHeaderValue", () => {
  it("lässt reines ASCII unverändert", () => {
    expect(encodeHeaderValue("Reminder")).toBe("Reminder");
  });

  it("kodiert Umlaute nach RFC 2047", () => {
    expect(encodeHeaderValue("Depesche prüfen")).toBe(
      `=?UTF-8?B?${Buffer.from("Depesche prüfen", "utf8").toString("base64")}?=`,
    );
  });
});

describe("chunkBase64", () => {
  it("bricht nach der vorgegebenen Länge um", () => {
    expect(chunkBase64("abcdefgh", 3)).toEqual(["abc", "def", "gh"]);
  });
});

describe("dotStuff", () => {
  it("verdoppelt einen führenden Punkt", () => {
    expect(dotStuff(".")).toBe("..");
    expect(dotStuff("kein Punkt")).toBe("kein Punkt");
  });
});

describe("addressOnly", () => {
  it("schält die Adresse aus einer Anzeigeform", () => {
    expect(addressOnly("Die Agentin <post@example.com>")).toBe("post@example.com");
    expect(addressOnly("post@example.com")).toBe("post@example.com");
  });
});

describe("buildMessage", () => {
  const msg = buildMessage({
    from: "Die Agentin <post@example.com>",
    to: "nicole@example.com",
    subject: "Depesche prüfen",
    text: "Hallo Nicole,\nbitte prüfen.",
    date: new Date("2026-06-10T09:00:00Z"),
    messageId: "fest@example.com",
  });

  it("nutzt CRLF und trennt Kopf von Körper durch eine Leerzeile", () => {
    expect(msg).toContain("\r\n\r\n");
    expect(msg.split("\r\n\r\n")).toHaveLength(2);
  });

  it("setzt die Pflichtköpfe", () => {
    expect(msg).toContain("To: nicole@example.com");
    expect(msg).toContain("Message-ID: <fest@example.com>");
    expect(msg).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(msg).toContain("Auto-Submitted: auto-generated");
  });

  it("überträgt den Text als Base64, in beide Richtungen lesbar", () => {
    const body = msg.split("\r\n\r\n")[1]!.split("\r\n").join("");
    expect(Buffer.from(body, "base64").toString("utf8")).toBe("Hallo Nicole,\nbitte prüfen.");
  });
});
