import { describe, it, expect } from "vitest";
import { recordingWorthImporting, selectableVideos, videoChoiceLabel } from "./mission-videos";
import type { VideoChoice } from "./mission-videos";

function video(over: Partial<VideoChoice> = {}): VideoChoice {
  return {
    id: "p1",
    title: "Ein Video",
    channel: "Kanal",
    year: 2025,
    videoId: "dQw4w9WgXcQ",
    missionId: null,
    missionName: null,
    ...over,
  };
}

describe("selectableVideos", () => {
  it("lässt weg, was schon an diesem Einsatz hängt", () => {
    const all = [video({ id: "a", missionId: "m1", missionName: "CIM" }), video({ id: "b" })];
    expect(selectableVideos(all, "m1").map((v) => v.id)).toEqual(["b"]);
  });

  it("stellt freie Videos vor die schon zugeordneten", () => {
    const all = [
      video({ id: "a", title: "A", missionId: "m2", missionName: "Andere" }),
      video({ id: "b", title: "B" }),
    ];
    expect(selectableVideos(all, "m1").map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("bietet fremd zugeordnete weiter an — Umhängen soll möglich bleiben", () => {
    const all = [video({ id: "a", missionId: "m2", missionName: "Andere" })];
    expect(selectableVideos(all, "m1")).toHaveLength(1);
  });

  it("sortiert je Gruppe nach Titel", () => {
    const all = [video({ id: "a", title: "Zebra" }), video({ id: "b", title: "Amsel" })];
    expect(selectableVideos(all, null).map((v) => v.title)).toEqual(["Amsel", "Zebra"]);
  });

  it("kommt mit einem neuen, noch nicht gespeicherten Einsatz zurecht", () => {
    const all = [video({ id: "a" }), video({ id: "b", missionId: "m2", missionName: "X" })];
    expect(selectableVideos(all, null)).toHaveLength(2);
  });
});

describe("videoChoiceLabel", () => {
  it("nennt Titel, Kanal und Jahr", () => {
    expect(videoChoiceLabel(video({ title: "Agenten", channel: "CCD", year: 2024 }))).toBe(
      "Agenten · CCD · 2024",
    );
  });

  it("lässt einen fehlenden Kanal weg, statt eine Lücke zu zeigen", () => {
    expect(videoChoiceLabel(video({ title: "Agenten", channel: null, year: 2024 }))).toBe(
      "Agenten · 2024",
    );
  });

  it("sagt dazu, wenn das Video woanders hängt", () => {
    expect(videoChoiceLabel(video({ missionId: "m2", missionName: "CIM Lingen" }))).toContain(
      'hängt an „CIM Lingen“',
    );
  });
});

describe("recordingWorthImporting", () => {
  it("gibt die Kennung zurück, wenn es sie noch nicht als Publikation gibt", () => {
    expect(recordingWorthImporting("https://youtu.be/dQw4w9WgXcQ", [])).toBe("dQw4w9WgXcQ");
  });

  it("schweigt, wenn dieselbe Aufzeichnung schon verknüpft ist", () => {
    expect(
      recordingWorthImporting("https://youtu.be/dQw4w9WgXcQ", [{ videoId: "dQw4w9WgXcQ" }]),
    ).toBeNull();
  });

  it("erkennt dieselbe Aufzeichnung auch in anderer Schreibweise", () => {
    // Am Einsatz als Kurzform, in der Publikation als watch-Adresse — für einen
    // Textvergleich wären das zwei verschiedene Videos.
    expect(
      recordingWorthImporting("https://youtu.be/dQw4w9WgXcQ?si=xyz", [{ videoId: "dQw4w9WgXcQ" }]),
    ).toBeNull();
  });

  it("schweigt bei fehlender oder fremder Adresse", () => {
    expect(recordingWorthImporting(null, [])).toBeNull();
    expect(recordingWorthImporting("", [])).toBeNull();
    expect(recordingWorthImporting("https://vimeo.com/1", [])).toBeNull();
  });

  it("lässt sich von einem anderen verknüpften Video nicht beirren", () => {
    expect(
      recordingWorthImporting("https://youtu.be/dQw4w9WgXcQ", [{ videoId: "aaaaaaaaaaa" }]),
    ).toBe("dQw4w9WgXcQ");
  });
});
