import type { Page } from "@playwright/test";

export type ThemeMode = "light" | "dark";

export async function gotoWithTheme(page: Page, route: string, theme: ThemeMode): Promise<void> {
    await page.context().addInitScript((mode: ThemeMode) => {
        window.localStorage.setItem("starlight-theme", mode);
        document.documentElement.dataset.theme = mode;
    }, theme);

    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.locator("body").waitFor();
    await page.waitForFunction((mode: ThemeMode) => document.documentElement.dataset.theme === mode, theme);
}
