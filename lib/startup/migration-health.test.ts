import { describe, expect, it } from "vitest";
import { resolveMigrationHealth, type MigrationFacts } from "./migration-health";

const done = (name: string) => ({ name, finishedAt: new Date("2026-09-01T00:00:00Z"), rolledBackAt: null });

const facts = (over: Partial<MigrationFacts> = {}): MigrationFacts => ({
  expected: ["0001_init", "0002_zwei"],
  rows: [done("0001_init"), done("0002_zwei")],
  ...over,
});

describe("resolveMigrationHealth", () => {
  it("meldet Ruhe, wenn die Datenbank vollständig ist", () => {
    const h = resolveMigrationHealth("applied", facts());
    expect(h.state).toBe("applied");
    expect(h.summary).toBe("");
  });

  it("überstimmt einen gescheiterten Prozesslauf, wenn die Datenbank stimmt", () => {
    // Der häufige Fall: Eine zweite Instanz hielt die Sperre, diese gab auf —
    // migriert war trotzdem alles.
    expect(resolveMigrationHealth("failed", facts()).state).toBe("applied");
  });

  it("meldet fehlende Migrationen, auch wenn der Prozess sich für fertig hält", () => {
    const h = resolveMigrationHealth("applied", facts({ rows: [done("0001_init")] }));
    expect(h.state).toBe("failed");
    expect(h.pending).toEqual(["0002_zwei"]);
    expect(h.summary).toContain("0002_zwei");
  });

  it("nennt bei mehreren die Anzahl und die älteste", () => {
    const h = resolveMigrationHealth("applied", facts({ expected: ["a", "b", "c"], rows: [] }));
    expect(h.summary).toContain("3 Migrationen");
    expect(h.summary).toContain("a");
  });

  it("erkennt eine halb angewendete Migration als Blockade", () => {
    const h = resolveMigrationHealth("applied", {
      expected: ["0001_init", "0002_zwei"],
      rows: [done("0001_init"), { name: "0002_zwei", finishedAt: null, rolledBackAt: null }],
    });
    expect(h.state).toBe("failed");
    expect(h.broken).toEqual(["0002_zwei"]);
    expect(h.summary).toContain("migrate resolve");
  });

  it("wertet eine zurückgerollte Migration als nicht angewendet", () => {
    const h = resolveMigrationHealth("applied", {
      expected: ["0001_init"],
      rows: [{ name: "0001_init", finishedAt: new Date(), rolledBackAt: new Date() }],
    });
    expect(h.state).toBe("failed");
  });

  it("fällt auf den Prozess-Merker zurück, wenn nichts zu lesen ist", () => {
    expect(resolveMigrationHealth("applied", null).state).toBe("applied");
    const failed = resolveMigrationHealth("failed", null);
    expect(failed.state).toBe("failed");
    expect(failed.summary).toContain("nicht nachlesen");
  });
});
