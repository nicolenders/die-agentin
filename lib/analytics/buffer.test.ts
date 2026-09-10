import { describe, it, expect, beforeEach } from "vitest";
import {
  bufferPageview,
  bufferedCount,
  takeBufferedPageviews,
  returnBufferedPageviews,
  resetPageviewBuffer,
  droppedCount,
  MAX_BUFFERED,
  type BufferedPageview,
} from "@/lib/analytics/buffer";

function entry(path: string): BufferedPageview {
  return {
    day: new Date("2026-09-10T00:00:00.000Z"),
    path,
    locale: "de",
    section: "start",
    country: "DE",
    visitorHash: "hash",
  };
}

beforeEach(() => resetPageviewBuffer());

describe("Seitenaufruf-Zwischenspeicher", () => {
  it("sammelt und zählt", () => {
    bufferPageview(entry("/de"));
    expect(bufferPageview(entry("/de/depeschen"))).toBe(2);
    expect(bufferedCount()).toBe(2);
  });

  it("gibt beim Abholen alles heraus und ist danach leer", () => {
    bufferPageview(entry("/de"));
    expect(takeBufferedPageviews()).toHaveLength(1);
    expect(bufferedCount()).toBe(0);
  });

  it("nimmt nicht geschriebene Einträge zurück", () => {
    const taken = [entry("/de"), entry("/en")];
    bufferPageview(entry("/de/akte"));
    returnBufferedPageviews(taken);
    expect(bufferedCount()).toBe(3);
    expect(takeBufferedPageviews()[0]!.path).toBe("/de");
  });

  it("verwirft die ältesten Einträge, wenn niemand abholt", () => {
    for (let i = 0; i < MAX_BUFFERED + 5; i += 1) bufferPageview(entry(`/de/${i}`));
    expect(bufferedCount()).toBe(MAX_BUFFERED);
    expect(droppedCount()).toBe(5);
    expect(takeBufferedPageviews()[0]!.path).toBe("/de/5");
  });
});
