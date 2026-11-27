import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "off",
    ...devices["Desktop Chrome"],
    // PW_CHANNEL=chrome uses the installed Chrome instead of the Playwright build.
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  webServer: [
    {
      command: "node e2e/fake-openai.mjs",
      url: "http://localhost:3199/health",
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: "npm run build && npm run start -- --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        OPENAI_API_KEY: "sk-fake-for-tests",
        OPENAI_MODEL: "fake-model",
        OPENAI_BASE_URL: "http://localhost:3199/v1",
        OPENAI_PRICE_INPUT_PER_MTOK: "2",
        OPENAI_PRICE_OUTPUT_PER_MTOK: "8",
        ALLOW_MEMORY_LIMITS: "1",
        DAILY_GENERATIONS_PER_VISITOR: "2",
        GENERATIONS_PER_MINUTE: "20",
        IP_HASH_SALT: "end-to-end-test-salt",
      },
    },
  ],
});
