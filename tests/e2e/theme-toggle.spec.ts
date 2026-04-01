import { expect, test } from "@playwright/test";

import { gotoWithTheme } from "./helpers/theme";

test.describe("theme toggle", () => {
    test.skip(({ isMobile }) => isMobile, "theme toggle hidden on mobile");

    test("toggles from light to dark", async ({ page }) => {
        await gotoWithTheme(page, "/", "light");

        const toggle = page.locator("northwestern-theme-toggle button");
        await expect(toggle).toBeVisible();

        await toggle.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });

    test("toggles from dark to light", async ({ page }) => {
        await gotoWithTheme(page, "/", "dark");

        const toggle = page.locator("northwestern-theme-toggle button");
        await toggle.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });

    test("persists theme across navigation", async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: "light", baseURL: "http://127.0.0.1:4321" });
        const page = await context.newPage();

        await page.goto("/", { waitUntil: "networkidle" });

        const toggle = page.locator("northwestern-theme-toggle button");
        await toggle.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

        await page.goto("/getting-started/", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

        await context.close();
    });

    test("toggle is keyboard accessible", async ({ page }) => {
        await gotoWithTheme(page, "/", "light");

        const toggle = page.locator("northwestern-theme-toggle button");
        await toggle.focus();
        await expect(toggle).toBeFocused();

        await page.keyboard.press("Enter");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

        await page.keyboard.press("Space");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });
});
