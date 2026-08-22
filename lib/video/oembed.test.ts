import { describe, it, expect } from "vitest";
import { parseOEmbed } from "./oembed";

describe("parseOEmbed", () => {
  it("liest Titel und Kanal", () => {
    expect(
      parseOEmbed({ title: "Agenten in der Praxis", author_name: "Cloud Community", type: "video" }),
    ).toEqual({ title: "Agenten in der Praxis", channel: "Cloud Community" });
  });

  it("stutzt Leerraum", () => {
    expect(parseOEmbed({ title: "  Titel  ", author_name: " Kanal " })).toEqual({
      title: "Titel",
      channel: "Kanal",
    });
  });

  it("macht aus Leerem null, nicht aus einem leeren Titel einen Titel", () => {
    expect(parseOEmbed({ title: "   ", author_name: "" })).toEqual({ title: null, channel: null });
  });

  it("verträgt fehlende Felder", () => {
    expect(parseOEmbed({ type: "video" })).toEqual({ title: null, channel: null });
  });

  it("verträgt Unsinn, statt zu werfen", () => {
    expect(parseOEmbed(null)).toEqual({ title: null, channel: null });
    expect(parseOEmbed("kaputt")).toEqual({ title: null, channel: null });
    expect(parseOEmbed({ title: 42, author_name: [] })).toEqual({ title: null, channel: null });
  });
});
