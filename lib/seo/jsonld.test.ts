import { describe, expect, it, afterEach } from "vitest";
import { personNode, webSiteNode, profilePageNode, graph, PERSON_ID } from "./jsonld";
import type { PersonInput } from "./jsonld";

const originalHost = process.env.PUBLIC_SITE_HOST;
process.env.PUBLIC_SITE_HOST = "nicolenders.com";

afterEach(() => {
  if (originalHost === undefined) process.env.PUBLIC_SITE_HOST = "nicolenders.com";
  else process.env.PUBLIC_SITE_HOST = originalHost;
});

function person(overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    name: "Nicole Enders",
    alternateName: ["Die Agentin"],
    jobTitle: "Microsoft MVP",
    description: "Beschreibung.",
    disambiguatingDescription: "Abgrenzung.",
    sameAs: [],
    knowsAbout: [],
    awards: [],
    ...overrides,
  };
}

describe("personNode", () => {
  it("verbindet Personennamen und Marke über alternateName", () => {
    const node = personNode(person()) as Record<string, unknown>;
    expect(node.name).toBe("Nicole Enders");
    expect(node.alternateName).toEqual(["Die Agentin"]);
  });

  it("trägt die Abgrenzung gegen gleichnamige Entitäten", () => {
    const node = personNode(person()) as Record<string, unknown>;
    expect(node.disambiguatingDescription).toBe("Abgrenzung.");
  });

  it("lässt leere Felder ganz weg, statt sie leer auszugeben", () => {
    const node = personNode(
      person({ alternateName: [], disambiguatingDescription: "" }),
    ) as Record<string, unknown>;
    expect(node).not.toHaveProperty("alternateName");
    expect(node).not.toHaveProperty("disambiguatingDescription");
  });
});

describe("webSiteNode", () => {
  it("nimmt Ausweichnamen in Präferenzreihenfolge auf", () => {
    const node = webSiteNode("Die Agentin", "de", ["Nicole Enders", "nicolenders.com"]) as Record<
      string,
      unknown
    >;
    expect(node.name).toBe("Die Agentin");
    expect(node.alternateName).toEqual(["Nicole Enders", "nicolenders.com"]);
  });

  it("gibt alternateName ohne Ausweichnamen nicht aus", () => {
    expect(webSiteNode("Die Agentin", "de")).not.toHaveProperty("alternateName");
  });
});

describe("profilePageNode", () => {
  it("zeigt über die stabile @id auf den Person-Knoten, statt ihn zu wiederholen", () => {
    const node = profilePageNode("https://nicolenders.com/de/legende") as Record<string, unknown>;
    expect(node["@type"]).toBe("ProfilePage");
    expect(node.mainEntity).toEqual({ "@id": PERSON_ID() });
    expect(node.url).toBe("https://nicolenders.com/de/legende");
  });

  it("nimmt ein Änderungsdatum nur auf, wenn es eines gibt", () => {
    expect(profilePageNode("https://nicolenders.com/de/legende")).not.toHaveProperty("dateModified");
    expect(
      profilePageNode("https://nicolenders.com/de/legende", "2026-09-06T10:00:00.000Z"),
    ).toHaveProperty("dateModified", "2026-09-06T10:00:00.000Z");
  });
});

describe("graph", () => {
  it("hält Person und WebSite über @id zusammen", () => {
    const parsed = JSON.parse(
      graph([personNode(person()), webSiteNode("Die Agentin", "de", ["Nicole Enders"])]),
    );
    expect(parsed["@context"]).toBe("https://schema.org");
    const [personGraphNode, siteGraphNode] = parsed["@graph"];
    expect(siteGraphNode.publisher["@id"]).toBe(personGraphNode["@id"]);
  });
});
