import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4100",
    trace: "off",
    // PW_CHANNEL=chrome uses the installed Chrome instead of the Playwright build.
    ...devices["Desktop Chrome"],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  webServer: {
    command: "pnpm build:spike && pnpm preview --strictPort",
    url: "http://localhost:4100/spike.html",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
