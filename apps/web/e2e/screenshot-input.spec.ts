import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PNG = readFileSync(join(__dirname, "../public/examples/invite-members.png"));
const png = (name = "card.png") => ({ name, mimeType: "image/png", buffer: PNG });

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
    ),
  ).toEqual([]);
}

/** Dispatches a paste or drop event carrying the PNG, as a browser does. */
async function sendFile(page: Page, kind: "paste" | "drop", selector?: string) {
  await page.evaluate(
    async ({ kind, selector, base64 }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], kind === "paste" ? "" : "dropped.png", { type: "image/png" });
      const data = new DataTransfer();
      data.items.add(file);
      if (kind === "paste") {
        document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
      } else {
        const target = document.querySelector(selector ?? "body") as HTMLElement;
        target.dispatchEvent(new DragEvent("dragover", { dataTransfer: data, bubbles: true }));
        target.dispatchEvent(new DragEvent("drop", { dataTransfer: data, bubbles: true }));
      }
    },
    { kind, selector, base64: PNG.toString("base64") },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
});

test.describe("landing upload box", () => {
  test("uploads a screenshot and continues in the app with the same settings", async ({ page }) => {
    await page.goto("/");
    const generate = page.getByRole("button", { name: "Generate", exact: true });
    await expect(generate).toBeDisabled();

    await page.getByTestId("screenshot-input").setInputFiles(png("pricing-table.png"));
    await expect(page.getByText("pricing-table.png")).toBeVisible();
    await expect(page.getByText("1280 × 1232 · 89 KB")).toBeVisible();

    await page.getByLabel("Framework").selectOption("vue");
    await page.getByLabel("Styling").selectOption("tailwind");
    await generate.click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("img", { name: "Screenshot: pricing-table.png" })).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Framework" }).getByRole("button", { name: "Vue" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("group", { name: "Styling" }).getByRole("button", { name: "Tailwind" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("rejects a file that is not an image, whatever its name", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("screenshot-input").setInputFiles({
      name: "notes.png",
      mimeType: "image/png",
      buffer: Buffer.from("%PDF-1.7 not an image"),
    });
    await expect(page.getByText("notes.png is not a PNG, JPEG or WebP image.")).toBeVisible();
  });

  test("rejects a file over 5 MB", async ({ page }) => {
    await page.goto("/");
    const big = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
    await page
      .getByTestId("screenshot-input")
      .setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: big });
    await expect(page.getByText("huge.png is 6.1 MB. The limit is 5 MB.")).toBeVisible();
  });

  test("accepts a pasted image", async ({ page }) => {
    await page.goto("/");
    // Retries until the page is hydrated and listening for paste.
    await expect(async () => {
      await sendFile(page, "paste");
      await expect(page.getByText("pasted-image.png")).toBeVisible({ timeout: 1000 });
    }).toPass();
  });

  test("only lists styles that work with the framework", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Styling").selectOption("scss");
    await page.getByLabel("Framework").selectOption("html");
    await expect(page.getByLabel("Styling")).toHaveValue("css");
    await expect(page.getByLabel("Styling").locator("option")).toHaveText(["CSS", "Tailwind"]);
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expectNoAxeViolations(page);
  });
});

test.describe("app workspace", () => {
  test("starts from the example screenshot", async ({ page }) => {
    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Your component will appear here" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Invite members card" }).click();
    await expect(page.getByText("invite-members.png")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("invite-members");
  });

  test("accepts a dropped file, then replaces and removes it", async ({ page }) => {
    await page.goto("/app");
    await expect(async () => {
      await sendFile(page, "drop", '[role="button"][tabindex="0"]');
      await expect(page.getByText("dropped.png")).toBeVisible({ timeout: 1000 });
    }).toPass();

    await page.getByTestId("screenshot-replace-input").setInputFiles(png("settings-page.png"));
    await expect(page.getByText("settings-page.png")).toBeVisible();

    await page.getByRole("button", { name: "Remove screenshot" }).click();
    await expect(page.getByRole("button", { name: "Drop a screenshot" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Generate .* component/ })).toBeDisabled();
  });

  test("disables SCSS for HTML and says why", async ({ page }) => {
    await page.goto("/app");
    const styling = page.getByRole("group", { name: "Styling" });
    await page
      .getByRole("group", { name: "Framework" })
      .getByRole("button", { name: "HTML" })
      .click();
    await expect(styling.getByRole("button", { name: "SCSS" })).toBeDisabled();
    await expect(styling.getByRole("button", { name: "CSS", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("HTML has no SCSS build step.")).toBeVisible();
  });

  test("keeps the screenshot and settings after a reload", async ({ page }) => {
    await page.goto("/app");
    await page.getByTestId("screenshot-input").setInputFiles(png("dashboard.png"));
    await page
      .getByRole("group", { name: "Framework" })
      .getByRole("button", { name: "React" })
      .click();
    await page.getByLabel(/Instructions/).fill("Keep the original spacing.");
    await page.reload();
    await expect(page.getByText("dashboard.png")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Framework" }).getByRole("button", { name: "React" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel(/Instructions/)).toHaveValue("Keep the original spacing.");
  });

  test("switches theme from the menu", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  for (const theme of ["dark", "light"] as const) {
    test(`has no accessibility violations in ${theme} theme`, async ({ page }) => {
      await page.goto("/app");
      await page.evaluate((t) => localStorage.setItem("ptc-theme", t), theme);
      await page.reload();
      await expectNoAxeViolations(page);
      await page.getByTestId("screenshot-input").setInputFiles(png());
      await page
        .getByRole("group", { name: "Framework" })
        .getByRole("button", { name: "HTML" })
        .click();
      await expectNoAxeViolations(page);
    });
  }

  test("uses Chat and Result tabs on phones", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/app");
    await expect(
      page.getByRole("complementary", { name: "Screenshot and settings" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Result" })).toBeHidden();
    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Result" }).click();
    await expect(page.getByRole("region", { name: "Result" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Screenshot and settings" })).toBeHidden();
  });
});
