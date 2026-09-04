import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import Gallery, { type GalleryImage, type GalleryLabels } from "./Gallery";

afterEach(cleanup);

const labels: GalleryLabels = {
  region: "Fotos vom Einsatz",
  open: "Bild groß ansehen",
  prev: "Vorheriges Bild",
  next: "Nächstes Bild",
  close: "Schließen",
  position: "Bild {n} von {total}",
  aiLabel: "KI-generiert",
  aiTitle: "KI-generiertes Bild",
};

const images: GalleryImage[] = [
  { url: "/media/a.jpg", alt: "Selfie am Stand", width: 3024, height: 4032 },
  { url: "/media/b.jpg", alt: "Auf der Bühne", width: 4032, height: 3024 },
  { url: "/media/c.jpg", alt: "Der Bahnhof", width: 4000, height: 2250, ai: true },
];

describe("Gallery", () => {
  it("zeigt jedes Bild mit seinem Alt-Text", () => {
    render(<Gallery images={images} labels={labels} />);
    expect(screen.getByRole("region", { name: "Fotos vom Einsatz" })).toBeTruthy();
    for (const img of images) expect(screen.getByAltText(img.alt)).toBeTruthy();
  });

  it("gibt jeder Kachel das Seitenverhältnis ihres Bildes — nichts wird beschnitten", () => {
    const { container } = render(<Gallery images={images} labels={labels} />);
    const tiles = [...container.querySelectorAll<HTMLElement>(".mosaic-item")];
    expect(tiles).toHaveLength(3);
    expect(tiles[0]!.style.aspectRatio).toBe(String(3024 / 4032));
    expect(tiles[1]!.style.aspectRatio).toBe(String(4032 / 3024));
  });

  it("öffnet die Großansicht beim Klick auf eine Kachel", () => {
    render(<Gallery images={images} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Bild groß ansehen: Auf der Bühne" }));
    const dialog = screen.getByRole("dialog", { name: "Auf der Bühne" });
    expect(dialog).toBeTruthy();
    expect(screen.getByText("Bild 2 von 3")).toBeTruthy();
  });

  it("blättert endlos vorwärts und rückwärts", () => {
    render(<Gallery images={images} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Bild groß ansehen: Der Bahnhof" }));
    expect(screen.getByText("Bild 3 von 3")).toBeTruthy();
    // Hinter dem letzten kommt wieder das erste.
    fireEvent.click(screen.getByRole("button", { name: "Nächstes Bild" }));
    expect(screen.getByText("Bild 1 von 3")).toBeTruthy();
    // Und vor dem ersten das letzte.
    fireEvent.click(screen.getByRole("button", { name: "Vorheriges Bild" }));
    expect(screen.getByText("Bild 3 von 3")).toBeTruthy();
  });

  it("lässt sich mit den Pfeiltasten bedienen und mit Escape schließen", () => {
    render(<Gallery images={images} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Bild groß ansehen: Selfie am Stand" }));
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("Bild 2 von 3")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("zeigt den KI-Hinweis am Bild und in der Großansicht", () => {
    render(<Gallery images={images} labels={labels} />);
    expect(screen.getAllByText("KI-generiert")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Bild groß ansehen: Der Bahnhof" }));
    expect(screen.getAllByText("KI-generiert")).toHaveLength(2);
  });

  it("bietet für ein fehlendes Bild keine Großansicht an", () => {
    render(<Gallery images={[{ alt: "Bild 1", label: "Bild 1" }]} labels={labels} />);
    expect(screen.queryByRole("button", { name: /Bild groß ansehen/ })).toBeNull();
    expect(screen.getByText("Bild 1")).toBeTruthy();
  });
});
