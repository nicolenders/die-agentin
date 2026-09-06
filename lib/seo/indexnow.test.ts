import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { buildPayload, dispatchUrls, indexNowKey, submitToIndexNow, INDEXNOW_KEY_PATH } from "./indexnow";

const KEY = "a1b2c3d4e5f6a1b2c3d4e5f6";

function configure(key: string | undefined, host = "nicolenders.com") {
  if (key === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = key;
  if (host) process.env.PUBLIC_SITE_HOST = host;
  else delete process.env.PUBLIC_SITE_HOST;
}

const originalKey = process.env.INDEXNOW_KEY;
const originalHost = process.env.PUBLIC_SITE_HOST;

afterEach(() => {
  if (originalKey === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = originalKey;
  if (originalHost === undefined) delete process.env.PUBLIC_SITE_HOST;
  else process.env.PUBLIC_SITE_HOST = originalHost;
  vi.restoreAllMocks();
});

describe("indexNowKey", () => {
  it("gibt den konfigurierten Schlüssel zurück", () => {
    configure(KEY);
    expect(indexNowKey()).toBe(KEY);
  });

  it("ist leer, wenn nichts konfiguriert ist", () => {
    configure(undefined);
    expect(indexNowKey()).toBe("");
  });

  it("verwirft einen zu kurzen Schlüssel", () => {
    configure("kurz");
    expect(indexNowKey()).toBe("");
  });

  it("verwirft Schlüssel mit unerlaubten Zeichen", () => {
    configure("a1b2c3d4/e5f6+g7h8");
    expect(indexNowKey()).toBe("");
  });
});

describe("buildPayload", () => {
  beforeEach(() => configure(KEY));

  it("baut Host, Schlüssel, Schlüssel-URL und Liste", () => {
    const payload = buildPayload(["https://nicolenders.com/de/depeschen/x"]);
    expect(payload).toEqual({
      host: "nicolenders.com",
      key: KEY,
      keyLocation: `https://nicolenders.com${INDEXNOW_KEY_PATH}`,
      urlList: ["https://nicolenders.com/de/depeschen/x"],
    });
  });

  it("löst relative Pfade gegen den kanonischen Host auf", () => {
    expect(buildPayload(["/de/legende"])?.urlList).toEqual(["https://nicolenders.com/de/legende"]);
  });

  it("sortiert fremde Hosts aus — sie würden die ganze Meldung ablehnen lassen", () => {
    const payload = buildPayload([
      "https://nicolenders.com/de",
      "https://example.com/de",
      "https://staging.azurecontainerapps.io/de",
    ]);
    expect(payload?.urlList).toEqual(["https://nicolenders.com/de"]);
  });

  it("entfernt Doppelungen", () => {
    const payload = buildPayload(["https://nicolenders.com/de", "https://nicolenders.com/de"]);
    expect(payload?.urlList).toHaveLength(1);
  });

  it("verwirft Eingaben, die weder Pfad noch absolute URL sind", () => {
    // `new URL(x, basis)` würde daraus stillschweigend
    // "https://nicolenders.com/ht!tp:/" machen — eine Seite, die es nicht gibt.
    expect(
      buildPayload(["ht!tp://", "de/depeschen", "https://nicolenders.com/de"])?.urlList,
    ).toEqual(["https://nicolenders.com/de"]);
  });

  it("verwirft http-URLs auf dem eigenen Host", () => {
    expect(buildPayload(["http://nicolenders.com/de"])).toBeNull();
  });

  it("ist null ohne Schlüssel", () => {
    configure(undefined);
    expect(buildPayload(["https://nicolenders.com/de"])).toBeNull();
  });

  it("ist null, wenn keine URL übrig bleibt", () => {
    expect(buildPayload(["https://example.com/de"])).toBeNull();
  });
});

describe("submitToIndexNow", () => {
  it("meldet nicht, wenn kein Schlüssel konfiguriert ist", async () => {
    configure(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await submitToIndexNow(["https://nicolenders.com/de"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.submitted).toBe(0);
    expect(result.reason).toBeTruthy();
  });

  it("schickt die Meldung als JSON-POST", async () => {
    configure(KEY);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await submitToIndexNow(["https://nicolenders.com/de/depeschen/x"]);

    expect(result).toEqual({ submitted: 1 });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body)).urlList).toEqual([
      "https://nicolenders.com/de/depeschen/x",
    ]);
  });

  it("gibt einen Fehlerstatus zurück, statt zu werfen", async () => {
    configure(KEY);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 422 }));
    const result = await submitToIndexNow(["https://nicolenders.com/de"]);
    expect(result.submitted).toBe(0);
    expect(result.reason).toContain("422");
  });

  it("fängt einen Netzwerkfehler ab — eine Veröffentlichung darf daran nicht scheitern", async () => {
    configure(KEY);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));
    const result = await submitToIndexNow(["https://nicolenders.com/de"]);
    expect(result.submitted).toBe(0);
    expect(result.reason).toContain("ECONNRESET");
  });
});

describe("dispatchUrls", () => {
  beforeEach(() => configure(KEY));

  it("meldet beide Sprachfassungen, die Übersichten und das HQ", () => {
    expect(dispatchUrls({ de: "erste-meldung", en: "first-report" })).toEqual([
      "https://nicolenders.com/en/depeschen/first-report",
      "https://nicolenders.com/de/depeschen/erste-meldung",
      "https://nicolenders.com/de",
      "https://nicolenders.com/en",
      "https://nicolenders.com/de/depeschen",
      "https://nicolenders.com/en/depeschen",
    ]);
  });

  it("lässt eine fehlende Übersetzung weg", () => {
    const urls = dispatchUrls({ de: "nur-deutsch", en: null });
    expect(urls).toContain("https://nicolenders.com/de/depeschen/nur-deutsch");
    expect(urls.some((u) => u.includes("/en/depeschen/"))).toBe(false);
  });
});
