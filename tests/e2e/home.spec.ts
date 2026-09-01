import { expect, test } from "@playwright/test";

test("shows AtlasFrame's photo-first landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Every frame has a place/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "開始你的地圖" })).toBeVisible();
});
