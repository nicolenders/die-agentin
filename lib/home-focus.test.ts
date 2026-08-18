import { describe, it, expect } from "vitest";
import {
  HOME_FOCUS_MAX,
  homeFocusFull,
  homeFocusRoom,
  nextHomeFocusSortOrder,
  pickHomeFocusText,
} from "./home-focus";

describe("home-focus", () => {
  it("lässt bis zur Höchstzahl weitere Einträge zu", () => {
    expect(homeFocusFull(0)).toBe(false);
    expect(homeFocusFull(HOME_FOCUS_MAX - 1)).toBe(false);
    expect(homeFocusFull(HOME_FOCUS_MAX)).toBe(true);
    // Auch wenn von Hand mehr in der Datenbank stehen: kein weiterer dazu.
    expect(homeFocusFull(HOME_FOCUS_MAX + 3)).toBe(true);
  });

  it("zählt die freien Plätze und wird nie negativ", () => {
    expect(homeFocusRoom(0)).toBe(HOME_FOCUS_MAX);
    expect(homeFocusRoom(HOME_FOCUS_MAX)).toBe(0);
    expect(homeFocusRoom(HOME_FOCUS_MAX + 2)).toBe(0);
  });

  it("stellt neue Einträge hinten an", () => {
    expect(nextHomeFocusSortOrder([])).toBe(10);
    expect(nextHomeFocusSortOrder([10, 30, 20])).toBe(40);
    // Auch bei negativen Altwerten wird nach hinten sortiert.
    expect(nextHomeFocusSortOrder([-5])).toBe(5);
  });

  it("fällt ohne englische Fassung auf die deutsche zurück", () => {
    const row = { titleDe: "Copilot Studio", titleEn: null, textDe: "Agenten bauen.", textEn: "  " };
    expect(pickHomeFocusText(row, "de")).toEqual({ title: "Copilot Studio", text: "Agenten bauen." });
    expect(pickHomeFocusText(row, "en")).toEqual({ title: "Copilot Studio", text: "Agenten bauen." });
  });

  it("nimmt die englische Fassung, wenn sie gepflegt ist", () => {
    const row = {
      titleDe: "Agentische KI",
      titleEn: "Agentic AI",
      textDe: "Womit ich gerade baue.",
      textEn: "What I am building with right now.",
    };
    expect(pickHomeFocusText(row, "en")).toEqual({
      title: "Agentic AI",
      text: "What I am building with right now.",
    });
    expect(pickHomeFocusText(row, "de")).toEqual({
      title: "Agentische KI",
      text: "Womit ich gerade baue.",
    });
  });
});
