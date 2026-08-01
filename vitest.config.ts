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
      thresholds: {
        // SPEC §17: coverage >= 70% on lib/
        lines: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
