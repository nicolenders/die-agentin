import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, pageWindow, paginate, parsePage } from "./pagination";

describe("parsePage", () => {
  it("beginnt bei eins, wenn nichts oder Unsinn ankommt", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("null")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
  });

  it("übernimmt eine gültige Seite", () => {
    expect(parsePage("4")).toBe(4);
  });
});

describe("paginate", () => {
  it("rechnet Fenster und Grenzen für eine mittlere Seite", () => {
    const info = paginate(221, 2, 50);
    expect(info.page).toBe(2);
    expect(info.pageCount).toBe(5);
    expect(info.offset).toBe(50);
    expect(info.from).toBe(51);
    expect(info.to).toBe(100);
    expect(info.hasPrev).toBe(true);
    expect(info.hasNext).toBe(true);
  });

  it("endet auf der letzten Seite mit dem letzten Eintrag", () => {
    const info = paginate(221, 5, 50);
    expect(info.to).toBe(221);
    expect(info.hasNext).toBe(false);
  });

  it("holt eine zu hohe Seite auf die letzte zurück", () => {
    expect(paginate(221, 99, 50).page).toBe(5);
  });

  it("gibt einer leeren Liste eine Seite, nicht null", () => {
    const info = paginate(0, 1, 50);
    expect(info.pageCount).toBe(1);
    expect(info.from).toBe(0);
    expect(info.to).toBe(0);
    expect(info.hasNext).toBe(false);
  });

  it("nutzt die Standardgröße", () => {
    expect(paginate(120, 1).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("pageWindow", () => {
  it("zeigt bei wenigen Seiten alle", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it("kürzt lange Listen mit Auslassungen", () => {
    expect(pageWindow(10, 20, 1)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it("lässt am Rand keine unnötige Auslassung stehen", () => {
    expect(pageWindow(2, 5, 2)).toEqual([1, 2, 3, 4, 5]);
  });

  it("kommt mit einer einzigen Seite zurecht", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
