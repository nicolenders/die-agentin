import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DispatchBodyField, DispatchImagePoolProvider, DispatchImagesField } from "./DispatchImages";
import type { PoolImage } from "@/lib/dispatches/images";

afterEach(cleanup);

const pool: PoolImage[] = [
  { id: "a1", url: "/media/a1.webp", altDe: "Bühne", altEn: "Stage", decorative: false, ai: false },
  { id: "a2", url: "/media/a2.webp", altDe: "Publikum", altEn: null, decorative: false, ai: true },
];

const bodyWithImage = JSON.stringify({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Vorher" }] },
    { type: "image", attrs: { assetId: "a1", caption: "Keynote" } },
  ],
});

function hiddenValues(container: HTMLElement, name: string): string[] {
  return [...container.querySelectorAll<HTMLInputElement>(`input[type=hidden][name=${name}]`)].map((i) => i.value);
}

describe("DispatchImages", () => {
  it("behält ein gespeichertes Bild im Text und zeigt es im Editor", async () => {
    const { container } = render(
      <DispatchImagePoolProvider initial={pool}>
        <DispatchBodyField name="deBody" defaultValue={bodyWithImage} ariaLabel="Text DE" locale="de" />
      </DispatchImagePoolProvider>,
    );
    const [value] = hiddenValues(container, "deBody");
    expect(JSON.parse(value!).content[1]).toMatchObject({ type: "image", attrs: { assetId: "a1" } });
    await waitFor(() => expect(container.querySelector(".rich-image img")?.getAttribute("src")).toBe("/media/a1.webp"));
  });

  it("schreibt den Pool in Reihenfolge als versteckte Felder und lässt umsortieren", () => {
    const { container } = render(
      <DispatchImagePoolProvider initial={pool}>
        <DispatchImagesField usage={{ a1: ["de", "en"] }} />
      </DispatchImagePoolProvider>,
    );
    expect(hiddenValues(container, "imageIds")).toEqual(["a1", "a2"]);
    expect(screen.getByText("im Text DE + EN")).toBeTruthy();
    expect(screen.getByText("EN-Alt fehlt")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nach hinten: Bühne" }));
    expect(hiddenValues(container, "imageIds")).toEqual(["a2", "a1"]);

    fireEvent.click(screen.getByRole("button", { name: "Aus dem Pool entfernen: Publikum" }));
    expect(hiddenValues(container, "imageIds")).toEqual(["a1"]);
  });

  it("fügt ein Pool-Bild mit Bildunterschrift in den Text ein", async () => {
    const { container } = render(
      <DispatchImagePoolProvider initial={pool}>
        <DispatchBodyField name="enBody" defaultValue={null} ariaLabel="Text EN" locale="en" />
      </DispatchImagePoolProvider>,
    );
    const open = await screen.findByRole("button", { name: "Bild aus dem Pool einfügen" });
    fireEvent.click(open);
    expect(screen.getByText(/kein EN-Alt-Text/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Bildunterschrift \(EN\)/), { target: { value: "On stage" } });
    fireEvent.click(screen.getByRole("button", { name: "Einfügen: Bühne" }));

    await waitFor(() => {
      const doc = JSON.parse(hiddenValues(container, "enBody")[0]!);
      expect(doc.content.some((n: { type: string; attrs?: { assetId?: string; caption?: string } }) =>
        n.type === "image" && n.attrs?.assetId === "a1" && n.attrs?.caption === "On stage")).toBe(true);
    });
  });
});
