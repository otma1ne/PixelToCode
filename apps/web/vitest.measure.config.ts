import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Runs only the real-API measurement. Kept apart so `pnpm test` never spends credits. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["scripts/measure-generation.test.ts"],
    testTimeout: 10 * 60_000,
  },
});
