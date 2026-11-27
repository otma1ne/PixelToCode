import { expect, test, type Page } from "@playwright/test";

interface LogEntry {
  type: string;
  totalMs: number;
  timings?: Record<string, number>;
  message?: string;
  file?: string;
}

async function lastLog(page: Page): Promise<LogEntry> {
  const lines = (await page.locator("#log").textContent())?.trim().split("\n") ?? [];
  return JSON.parse(lines[lines.length - 1] ?? "{}") as LogEntry;
}

async function waitForResult(page: Page) {
  await expect(page.locator("#status")).not.toHaveAttribute("data-status", /idle|rendering/, {
    timeout: 45_000,
  });
}

test("compiles and renders the Angular Invite members card in the sandbox", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/spike.html");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#root")).toBeAttached();

  await page.click("#render");
  await waitForResult(page);
  const first = await lastLog(page);
  expect(first.type, first.message).toBe("rendered");

  await expect(frame.getByRole("heading", { name: "Invite members" })).toBeVisible();
  await expect(frame.getByText("Add people to Fieldnote Studio.")).toBeVisible();
  // Child component with a signal input, rendered by @for.
  await expect(frame.locator("app-member-row")).toHaveCount(4);
  await expect(frame.getByText("Maya Okafor")).toBeVisible();
  await expect(frame.getByText("MO", { exact: true })).toBeVisible();
  // @if inside the child component.
  await expect(frame.getByText("Pending")).toHaveCount(1);

  // Interactivity: signals update the view without zone.js.
  await frame.getByLabel("Email address").fill("lea@example.com");
  await frame.getByRole("button", { name: "Send invite" }).click();
  await expect(frame.locator("app-member-row")).toHaveCount(5);
  await expect(frame.getByText("5 members")).toBeVisible();

  // A second render reuses the cached compilers.
  await page.click("#rerender");
  await expect(page.locator("#status")).toHaveAttribute("data-status", "rendering");
  await waitForResult(page);
  const second = await lastLog(page);
  expect(second.type).toBe("rendered");
  await expect(frame.locator("app-member-row")).toHaveCount(4);

  console.log(`first render ${first.totalMs} ms`, first.timings);
  console.log(`second render ${second.totalMs} ms`, second.timings);
  expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
});

test("reports template errors as compile errors with the file", async ({ page }) => {
  await page.goto("/spike.html");
  await expect(page.frameLocator("#frame").locator("#root")).toBeAttached();
  await page.click("#broken");
  await waitForResult(page);
  const result = await lastLog(page);
  expect(result.type).toBe("compileError");
  expect(result.file).toBe("src/app/broken/broken.component.ts");
  console.log("compile error:", result.message);
});

test("the sandbox page cannot reach the network", async ({ page }) => {
  const response = await page.goto("/index.html");
  const html = await response?.text();
  expect(html).toContain("connect-src 'none'");
});
