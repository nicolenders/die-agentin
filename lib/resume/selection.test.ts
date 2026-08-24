import { describe, expect, it } from "vitest";
import {
  buildSelectionParams,
  filterSelected,
  isSelected,
  parseIdList,
  selectionFromParams,
  SELECT_EXCEPT_PARAM,
  SELECT_ONLY_PARAM,
} from "./selection";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const allIds = items.map((i) => i.id);

describe("parseIdList", () => {
  it("gibt ohne Parameter null zurück — dann gilt alles", () => {
    expect(parseIdList(undefined)).toBeNull();
  });

  it("unterscheidet einen leeren Parameter von einem fehlenden", () => {
    expect(parseIdList("")).toEqual(new Set());
  });

  it("liest eine Komma-Liste und ignoriert Leerstellen", () => {
    expect(parseIdList(" a , b ,, c ")).toEqual(new Set(["a", "b", "c"]));
  });

  it("nimmt auch mehrfach übergebene Parameter an", () => {
    expect(parseIdList(["a,b", "c"])).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("selectionFromParams", () => {
  it("ohne Parameter ist alles gewählt", () => {
    const selection = selectionFromParams({});
    expect(filterSelected(selection, items)).toEqual(items);
  });

  it("mit „nur“ gilt ausschließlich die Positivliste", () => {
    const selection = selectionFromParams({ [SELECT_ONLY_PARAM]: "b,d" });
    expect(filterSelected(selection, items).map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("mit „aus“ fällt die Ausschlussliste heraus", () => {
    const selection = selectionFromParams({ [SELECT_EXCEPT_PARAM]: "a,c" });
    expect(filterSelected(selection, items).map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("ein leeres „nur“ wählt nichts — nicht alles", () => {
    const selection = selectionFromParams({ [SELECT_ONLY_PARAM]: "" });
    expect(filterSelected(selection, items)).toEqual([]);
  });

  it("der Ausschluss gewinnt gegen die Positivliste", () => {
    const selection = selectionFromParams({
      [SELECT_ONLY_PARAM]: "a,b",
      [SELECT_EXCEPT_PARAM]: "b",
    });
    expect(isSelected(selection, "a")).toBe(true);
    expect(isSelected(selection, "b")).toBe(false);
  });

  it("unbekannte Kennungen ändern nichts an den übrigen", () => {
    const selection = selectionFromParams({ [SELECT_EXCEPT_PARAM]: "gibtesnicht" });
    expect(filterSelected(selection, items)).toEqual(items);
  });
});

describe("buildSelectionParams", () => {
  it("erzeugt bei voller Auswahl keinen Parameter", () => {
    expect(buildSelectionParams(allIds, allIds)).toEqual({});
  });

  it("nimmt bei kleiner Auswahl die Positivliste", () => {
    expect(buildSelectionParams(allIds, ["a"])).toEqual({ [SELECT_ONLY_PARAM]: "a" });
  });

  it("nimmt bei großer Auswahl die Ausschlussliste", () => {
    expect(buildSelectionParams(allIds, ["a", "b", "c"])).toEqual({
      [SELECT_EXCEPT_PARAM]: "d",
    });
  });

  it("wählt bei Gleichstand die Ausschlussliste", () => {
    expect(buildSelectionParams(allIds, ["a", "b"])).toEqual({
      [SELECT_EXCEPT_PARAM]: "c,d",
    });
  });

  it("bildet die leere Auswahl als leeres „nur“ ab", () => {
    expect(buildSelectionParams(allIds, [])).toEqual({ [SELECT_ONLY_PARAM]: "" });
  });

  it("ignoriert Kennungen, die es gar nicht gibt", () => {
    expect(buildSelectionParams(allIds, [...allIds, "fremd"])).toEqual({});
  });

  it("führt hin und zurück zur selben Auswahl", () => {
    const wanted = ["b", "c"];
    const selection = selectionFromParams(buildSelectionParams(allIds, wanted));
    expect(filterSelected(selection, items).map((i) => i.id)).toEqual(wanted);
  });
});
