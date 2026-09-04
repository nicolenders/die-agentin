import { describe, it, expect } from "vitest";
import { editHref, safeReturnTo, withParams } from "./return-to";

const LIST = "/admin/einsaetze";

describe("safeReturnTo", () => {
  it("nimmt die Liste mit Filtern an", () => {
    expect(safeReturnTo("/admin/einsaetze?status=DONE&jahr=2025", LIST)).toBe(
      "/admin/einsaetze?status=DONE&jahr=2025",
    );
  });

  it("nimmt die Liste ohne Query an", () => {
    expect(safeReturnTo(LIST, LIST)).toBe(LIST);
  });

  it("fällt ohne Angabe auf die Liste zurück", () => {
    expect(safeReturnTo(undefined, LIST)).toBe(LIST);
    expect(safeReturnTo("", LIST)).toBe(LIST);
    expect(safeReturnTo(null, LIST)).toBe(LIST);
  });

  it("weist fremde Ziele ab", () => {
    expect(safeReturnTo("https://example.com", LIST)).toBe(LIST);
    expect(safeReturnTo("//example.com", LIST)).toBe(LIST);
    expect(safeReturnTo("/admin/depeschen?q=x", LIST)).toBe(LIST);
    expect(safeReturnTo("javascript:alert(1)", LIST)).toBe(LIST);
  });

  it("weist Pfade ab, die nur mit dem Listenpfad anfangen", () => {
    expect(safeReturnTo("/admin/einsaetze.example.com", LIST)).toBe(LIST);
    expect(safeReturnTo("/admin/einsaetzeXY", LIST)).toBe(LIST);
  });

  it("lässt die Bearbeitungsmaske selbst nicht als Rückweg zu", () => {
    expect(safeReturnTo("/admin/einsaetze/bearbeiten?id=1", LIST)).toBe(LIST);
  });

  it("weist Adressen mit Steuerzeichen ab", () => {
    expect(safeReturnTo("/admin/einsaetze?q=a b", LIST)).toBe(LIST);
    expect(safeReturnTo('/admin/einsaetze?q="x"', LIST)).toBe(LIST);
  });
});

describe("withParams", () => {
  it("hängt an einen Pfad ohne Query an", () => {
    expect(withParams("/admin/einsaetze", { ok: "saved" })).toBe("/admin/einsaetze?ok=saved");
  });

  it("ergänzt eine bestehende Query", () => {
    expect(withParams("/admin/einsaetze?status=DONE", { ok: "saved" })).toBe(
      "/admin/einsaetze?status=DONE&ok=saved",
    );
  });

  it("ersetzt einen vorhandenen Wert", () => {
    expect(withParams("/admin/einsaetze?ok=alt", { ok: "neu" })).toBe("/admin/einsaetze?ok=neu");
  });

  it("entfernt leere Werte", () => {
    expect(withParams("/admin/einsaetze?ok=alt", { ok: "" })).toBe("/admin/einsaetze");
    expect(withParams("/admin/einsaetze?ok=alt", { ok: undefined })).toBe("/admin/einsaetze");
  });
});

describe("editHref", () => {
  it("nimmt die gefilterte Liste als Rückweg mit", () => {
    expect(editHref("/admin/einsaetze/bearbeiten", "abc", "/admin/einsaetze?status=DONE")).toBe(
      "/admin/einsaetze/bearbeiten?id=abc&zurueck=%2Fadmin%2Feinsaetze%3Fstatus%3DDONE",
    );
  });
});
