import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Each test gets its own address, so the per-visitor limit starts fresh.
let ip = 0;
test.beforeEach(async ({ context, page }) => {
  ip += 1;
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${ip}` });
  await page.goto("/app");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
});

async function startFromExample(page: Page) {
  await page.getByRole("button", { name: "Invite members card" }).click();
  await expect(page.getByText("invite-members.png")).toBeVisible();
}

const generateButton = (page: Page) => page.getByRole("button", { name: /^Generat/ });

test("generates a component and shows the real steps and files", async ({ page }) => {
  await startFromExample(page);
  await generateButton(page).click();

  // The steps come from the server as they happen.
  await expect(page.getByRole("heading", { name: "Generating Angular component" })).toBeVisible();
  await expect(page.getByText("Generate Angular · SCSS")).toBeVisible();

  await expect(
    page.getByText(/^Generated InviteMembersCard in \d+\.\d s with one subcomponent\.$/),
  ).toBeVisible();
  const files = page.getByRole("list", { name: "Generated files" });
  await expect(files.getByRole("listitem")).toHaveCount(3);
  await expect(files).toContainText("invite-members-card.component.ts");
  await expect(
    page.getByText("Removed packages the preview cannot load: @angular/material."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("InviteMembersCard");
  await expect(page.getByRole("heading", { level: 2, name: "InviteMembersCard" })).toBeVisible();
  await expect(page.getByText("The role menu shows Admin, Editor and Viewer.")).toBeVisible();

  // The result survives a reload in the same tab.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "InviteMembersCard" })).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test("reports a failed generation with a retry", async ({ page }) => {
  await startFromExample(page);
  await page.getByLabel(/Instructions/).fill("FAIL_PLEASE");
  await generateButton(page).click();
  await expect(page.getByText("Generation failed")).toBeVisible();
  await expect(page.getByText("The model could not be reached.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing to show" })).toBeVisible();
});

test("stops at the daily limit and says when it resets", async ({ page }) => {
  await startFromExample(page);
  for (let i = 0; i < 2; i++) {
    await generateButton(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "InviteMembersCard" })).toBeVisible();
  }
  await generateButton(page).click();
  await expect(page.getByText("Usage limit reached")).toBeVisible();
  await expect(
    page.getByText(/You have used all your generations for today\. You can generate again at/),
  ).toBeVisible();
  // The previous result stays available.
  await expect(page.getByRole("heading", { level: 2, name: "InviteMembersCard" })).toBeVisible();
});

test("starts the generation from the landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Invite members card" }).click();
  await page.getByLabel("Framework").selectOption("angular");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 2, name: "InviteMembersCard" })).toBeVisible();
});

test("blocks generation while offline", async ({ page, context }) => {
  await startFromExample(page);
  await context.setOffline(true);
  await expect(page.getByText("Offline. Generation needs a connection.")).toBeVisible();
  await expect(generateButton(page)).toBeDisabled();
  await context.setOffline(false);
  await expect(generateButton(page)).toBeEnabled();
});
