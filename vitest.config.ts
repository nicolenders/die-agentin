import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "components/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "lib/**/*.tsx"],
      exclude: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "lib/db.ts"],
      // Sperrklinke, kein Wunschzettel.
      //
      // SPEC §17 nennt 70 % als Ziel. Die Schwelle stand hier von Anfang an auf
      // 70, wurde aber nie ausgewertet: das CI-Gate rief `npm run test` auf,
      // nicht `test:coverage`. Gemessen lag die Abdeckung bei rund 47 %.
      //
      // Deshalb zwei Zahlen: die gemessene als Schwelle, damit sie ab jetzt
      // wirklich prüft und nur noch steigen kann — und das Ziel als Notiz
      // daneben. Eine Schwelle, an der jeder Lauf scheitert, wird nach einer
      // Woche abgeschaltet; eine, die hält, bleibt.
      //
      // Beim Anheben: die dicksten Lücken liegen in `lib/queries/*` (Zugriffe
      // ohne Test) und `lib/seo/jsonld.ts`.
      thresholds: {
        // Ziel laut SPEC §17: 70 %.
        lines: 46,
        functions: 43,
        statements: 47,
        branches: 48,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
