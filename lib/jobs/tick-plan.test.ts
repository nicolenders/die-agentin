import { describe, it, expect } from "vitest";
import {
  planTick,
  HINT_MAX_AGE_MS,
  PAGEVIEW_FLUSH_THRESHOLD,
} from "@/lib/jobs/tick-plan";

const now = new Date("2026-09-10T09:00:00.000Z"); // 9 Uhr: kein Sammelfenster

describe("planTick", () => {
  it("weckt die Datenbank, wenn es keine Terminnotiz gibt", () => {
    const plan = planTick({ now, hint: null, bufferedPageviews: 0 });
    expect(plan.touchDatabase).toBe(true);
  });

  it("lässt die Datenbank schlafen, wenn nichts offen ist", () => {
    const plan = planTick({
      now,
      hint: { nextDueAt: null, writtenAt: new Date("2026-09-10T08:00:00.000Z") },
      bufferedPageviews: 0,
    });
    expect(plan.touchDatabase).toBe(false);
  });

  it("weckt die Datenbank, wenn ein Termin erreicht ist", () => {
    const plan = planTick({
      now,
      hint: {
        nextDueAt: new Date("2026-09-10T09:00:00.000Z"),
        writtenAt: new Date("2026-09-10T08:00:00.000Z"),
      },
      bufferedPageviews: 0,
    });
    expect(plan.touchDatabase).toBe(true);
    expect(plan.reason).toMatch(/fällig/);
  });

  it("lässt einen Termin in der Zukunft schlafen", () => {
    const plan = planTick({
      now,
      hint: {
        nextDueAt: new Date("2026-09-10T10:00:00.000Z"),
        writtenAt: new Date("2026-09-10T08:00:00.000Z"),
      },
      bufferedPageviews: 0,
    });
    expect(plan.touchDatabase).toBe(false);
  });

  it("glaubt einer veralteten Notiz nicht", () => {
    const plan = planTick({
      now,
      hint: {
        nextDueAt: null,
        writtenAt: new Date(now.getTime() - HINT_MAX_AGE_MS - 1000),
      },
      bufferedPageviews: 0,
    });
    expect(plan.touchDatabase).toBe(true);
    expect(plan.reason).toMatch(/älter/);
  });

  it("schreibt gepufferte Seitenaufrufe im Sammelfenster weg", () => {
    const plan = planTick({
      now: new Date("2026-09-10T12:00:00.000Z"),
      hint: { nextDueAt: null, writtenAt: new Date("2026-09-10T11:00:00.000Z") },
      bufferedPageviews: 3,
    });
    expect(plan.touchDatabase).toBe(true);
    expect(plan.reason).toMatch(/Sammelfenster/);
  });

  it("öffnet kein Sammelfenster ohne gepufferte Seitenaufrufe", () => {
    const plan = planTick({
      now: new Date("2026-09-10T12:00:00.000Z"),
      hint: { nextDueAt: null, writtenAt: new Date("2026-09-10T11:00:00.000Z") },
      bufferedPageviews: 0,
    });
    expect(plan.touchDatabase).toBe(false);
  });

  it("schreibt weg, sobald der Puffer voll läuft — auch außerhalb des Fensters", () => {
    const plan = planTick({
      now,
      hint: { nextDueAt: null, writtenAt: new Date("2026-09-10T08:30:00.000Z") },
      bufferedPageviews: PAGEVIEW_FLUSH_THRESHOLD,
    });
    expect(plan.touchDatabase).toBe(true);
    expect(plan.reason).toMatch(/gepufferte/);
  });
});
