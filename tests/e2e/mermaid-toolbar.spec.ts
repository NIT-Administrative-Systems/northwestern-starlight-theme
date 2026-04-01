import { expect, test } from "@playwright/test";

import { gotoWithTheme } from "./helpers/theme";

const MERMAID_PAGE = "/examples/mermaid/";

test.describe("mermaid toolbar", () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithTheme(page, MERMAID_PAGE, "light");
        await page.locator("pre.mermaid svg").first().waitFor({ timeout: 15000 });
    });

    test("hover toolbar appears on mermaid diagrams", async ({ page, isMobile }) => {
        const diagram = page.locator("pre.mermaid").first();
        const toolbar = diagram.locator(".nu-mermaid-toolbar");

        await expect(toolbar).toBeAttached();

        if (isMobile) {
            await expect(toolbar).not.toHaveCSS("opacity", "0");
        } else {
            await expect(toolbar).toHaveCSS("opacity", "0");
            await diagram.hover();
            await expect(toolbar).toHaveCSS("opacity", "1");
        }
    });

    test("fullscreen opens and closes with button", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        const fullscreenBtn = diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]');
        await fullscreenBtn.click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();
        await expect(overlay).toHaveAttribute("role", "dialog");
        await expect(overlay).toHaveAttribute("aria-modal", "true");

        const closeBtn = overlay.locator('.nu-mermaid-btn[data-action="close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeAttached();
    });

    test("fullscreen closes with Escape", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();
        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(overlay).not.toBeAttached();
    });

    test("focus returns to fullscreen button after Escape", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        const fullscreenBtn = diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]');
        await fullscreenBtn.focus();
        await page.keyboard.press("Enter");

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(overlay).not.toBeAttached();
        await expect(fullscreenBtn).toBeFocused();
    });

    test("Tab cycles through overlay controls (focus trap)", async ({ page, isMobile }) => {
        test.skip(isMobile, "keyboard focus trap not applicable on mobile");
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        const fullscreenBtn = diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]');
        await fullscreenBtn.focus();
        await page.keyboard.press("Enter");

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const buttons = overlay.locator(".nu-mermaid-btn");
        const count = await buttons.count();
        expect(count).toBeGreaterThan(2);

        await expect(buttons.first()).toBeFocused();

        // Tab through all buttons
        for (let i = 1; i < count; i++) {
            await page.keyboard.press("Tab");
        }
        // Last button should be focused
        await expect(buttons.last()).toBeFocused();

        // One more Tab should wrap to first (focus trap)
        await page.keyboard.press("Tab");
        await expect(buttons.first()).toBeFocused();

        // Shift+Tab should wrap to last
        await page.keyboard.press("Shift+Tab");
        await expect(buttons.last()).toBeFocused();
    });

    test("mouse open allows Tab without visible focus on first button", async ({ page, isMobile }) => {
        test.skip(isMobile, "keyboard Tab not applicable on mobile");
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();
        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await expect(overlay).toBeFocused();

        await page.keyboard.press("Tab");
        const firstBtn = overlay.locator(".nu-mermaid-btn").first();
        await expect(firstBtn).toBeFocused();
    });

    test("zoom badge shows 100% on open and updates on zoom", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();
        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const badge = overlay.locator(".nu-mermaid-zoom-badge");
        await expect(badge).toHaveText("100%");

        await page.keyboard.press("+");
        const text = await badge.textContent();
        expect(text).not.toBe("100%");
    });

    test("keyboard zoom shortcuts work", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();

        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();
        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const badge = overlay.locator(".nu-mermaid-zoom-badge");

        await page.keyboard.press("+");
        const zoomedIn = await badge.textContent();
        expect(Number.parseInt(zoomedIn!, 10)).toBeGreaterThan(100);

        await page.keyboard.press("0");
        await expect(badge).toHaveText("100%");

        await page.keyboard.press("-");
        const zoomedOut = await badge.textContent();
        expect(Number.parseInt(zoomedOut!, 10)).toBeLessThan(100);
    });
});

test.describe("mermaid toolbar — toasts", () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithTheme(page, MERMAID_PAGE, "light");
        await page.locator("pre.mermaid svg").first().waitFor({ timeout: 15000 });
    });

    test("copy SVG shows toast", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await overlay.locator('.nu-mermaid-btn[data-action="copy-svg"]').click();

        const toast = overlay.locator(".nu-mermaid-toast");
        await expect(toast).toHaveText("SVG copied to clipboard");
        await expect(toast).toHaveClass(/nu-mermaid-toast-visible/);
    });

    test("copy mermaid source shows toast", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const copySourceBtn = overlay.locator('.nu-mermaid-btn[data-action="copy-source"]');
        if ((await copySourceBtn.count()) > 0) {
            await copySourceBtn.click();
            const toast = overlay.locator(".nu-mermaid-toast");
            await expect(toast).toHaveText("Mermaid source copied to clipboard");
        }
    });

    test("new toast replaces existing toast", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const copySvgBtn = overlay.locator('.nu-mermaid-btn[data-action="copy-svg"]');
        await copySvgBtn.click();
        await expect(overlay.locator(".nu-mermaid-toast")).toHaveCount(1);

        // Click again — should replace, not stack
        await copySvgBtn.click();
        await expect(overlay.locator(".nu-mermaid-toast")).toHaveCount(1);
    });

    test("toast disappears after timeout", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await overlay.locator('.nu-mermaid-btn[data-action="copy-svg"]').click();

        const toast = overlay.locator(".nu-mermaid-toast");
        await expect(toast).toHaveClass(/nu-mermaid-toast-visible/);

        // Toast should disappear after ~2200ms (2000ms display + 200ms fade)
        await expect(toast).not.toBeAttached({ timeout: 5000 });
    });
});

test.describe("mermaid toolbar — mobile", () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithTheme(page, MERMAID_PAGE, "light");
        await page.locator("pre.mermaid svg").first().waitFor({ timeout: 15000 });
    });

    test("zoom buttons are hidden on mobile", async ({ page, isMobile }) => {
        test.skip(!isMobile, "mobile-only test");

        const diagram = page.locator("pre.mermaid").first();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await expect(overlay.locator('[data-action="zoom-in"]')).not.toBeVisible();
        await expect(overlay.locator('[data-action="zoom-out"]')).not.toBeVisible();
        await expect(overlay.locator('[data-action="zoom-reset"]')).not.toBeVisible();

        // Action buttons should still be visible
        await expect(overlay.locator('[data-action="download-svg"]')).toBeVisible();
        await expect(overlay.locator('[data-action="close"]')).toBeVisible();
    });

    test("zoom buttons are visible on desktop", async ({ page, isMobile }) => {
        test.skip(isMobile, "desktop-only test");

        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        await expect(overlay.locator('[data-action="zoom-in"]')).toBeVisible();
        await expect(overlay.locator('[data-action="zoom-out"]')).toBeVisible();
        await expect(overlay.locator('[data-action="zoom-reset"]')).toBeVisible();
    });
});

test.describe("mermaid toolbar — success state", () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithTheme(page, MERMAID_PAGE, "light");
        await page.locator("pre.mermaid svg").first().waitFor({ timeout: 15000 });
    });

    test("rapid copy clicks do not duplicate success icons", async ({ page }) => {
        const diagram = page.locator("pre.mermaid").first();
        await diagram.hover();
        await diagram.locator('.nu-mermaid-btn[data-action="fullscreen"]').click();

        const overlay = page.locator(".nu-mermaid-overlay");
        await expect(overlay).toBeVisible();

        const copySvgBtn = overlay.locator('.nu-mermaid-btn[data-action="copy-svg"]');

        // Click three times rapidly
        await copySvgBtn.click();
        await copySvgBtn.click();
        await copySvgBtn.click();

        // Should only have 1 check icon + 1 original icon (hidden), never more
        const checkIcons = copySvgBtn.locator(".nu-mermaid-check");
        await expect(checkIcons).toHaveCount(1);

        const allSvgs = copySvgBtn.locator("svg");
        await expect(allSvgs).toHaveCount(2); // original (hidden) + check
    });
});

test.describe("mermaid toolbar — dark mode", () => {
    test("diagrams render in dark mode without errors", async ({ page }) => {
        await gotoWithTheme(page, MERMAID_PAGE, "dark");
        await page.locator("pre.mermaid svg").first().waitFor({ timeout: 15000 });

        const errors = page.locator("pre.mermaid div[style*='color: red']");
        await expect(errors).toHaveCount(0);
    });
});
