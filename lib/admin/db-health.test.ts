import { describe, it, expect } from "vitest";
import { adminDbState } from "./db-health";

// Der Fehler, der hier festgehalten wird: Eine erreichbare Datenbank mit
// gescheitertem Migrationslauf ergab eine nicht-ok-Antwort, und die Zentrale
// legte daraufhin dauerhaft „Datenbank wird geweckt" über eine Oberfläche, in
// der Inhalte sichtbar und bearbeitbar waren.

describe("adminDbState", () => {
  it("sperrt nur, wenn die Datenbank nicht antwortet", () => {
    expect(adminDbState(false, { ok: false, migrations: "applied" }).blocking).toBe(true);
    expect(adminDbState(false, null).blocking).toBe(true);
  });

  it("sperrt NICHT, wenn die Datenbank antwortet und nur die Migration scheiterte", () => {
    const state = adminDbState(true, { ok: true, migrations: "failed" });
    expect(state.blocking).toBe(false);
    expect(state.warnMigrations).toBe(true);
  });

  it("warnt nicht im Normalfall", () => {
    for (const migrations of ["applied", "pending"] as const) {
      const state = adminDbState(true, { ok: true, migrations });
      expect(state.blocking, migrations).toBe(false);
      expect(state.warnMigrations, migrations).toBe(false);
    }
  });

  it("warnt nicht über Migrationen, solange die Datenbank schweigt", () => {
    // Sonst stünden zwei Meldungen nebeneinander, von denen eine nichts
    // aussagt — der Migrationsstand ist unbekannt, wenn niemand antwortet.
    expect(adminDbState(false, { migrations: "failed" }).warnMigrations).toBe(false);
  });

  it("kommt ohne Antwortkörper zurecht", () => {
    const state = adminDbState(true, null);
    expect(state.blocking).toBe(false);
    expect(state.migrations).toBe("pending");
  });
});
