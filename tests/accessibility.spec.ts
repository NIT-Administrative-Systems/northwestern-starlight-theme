import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { gotoWithTheme, type ThemeMode } from "./helpers/theme";

const routes = [
    "/",
    "/getting-started/",
    "/customization/",
    "/examples/style-guide/",
    "/examples/code-blocks/",
    "/examples/mermaid/",
    "/components/property-table/",
    "/components/tooltip/",
    "/components/kbd/",
];

const themes: ThemeMode[] = ["light", "dark"];

function runAxeSuite(label: string, mediaOverrides?: Record<string, string>) {
    for (const theme of themes) {
        test.describe(`${label} (${theme})`, () => {
            test.use({ colorScheme: theme });

            for (const route of routes) {
                test(`${route} has no serious or critical axe violations`, async ({ page }) => {
                    if (mediaOverrides) {
                        await page.emulateMedia(mediaOverrides as Parameters<typeof page.emulateMedia>[0]);
                    }
                    await gotoWithTheme(page, route, theme);

                    const results = await new AxeBuilder({ page }).include("main").analyze();
                    const violations = results.violations.filter(
                        (v) => v.impact === "serious" || v.impact === "critical",
                    );

                    if (violations.length > 0) {
                        const summary = violations.flatMap((v) =>
                            v.nodes.map((node) => ({
                                rule: v.id,
                                impact: v.impact,
                                target: node.target.join(" > "),
                                message: node.any?.[0]?.message ?? v.help,
                            })),
                        );

                        const report = summary
                            .map((s, i) => `  ${i + 1}. [${s.rule}] ${s.target}\n     ${s.message}`)
                            .join("\n\n");

                        expect.soft(violations, `\n\n${report}\n`).toHaveLength(0);
                    }

                    expect(violations).toHaveLength(0);
                });
            }
        });
    }
}

// Standard accessibility
runAxeSuite("accessibility");

// High contrast mode
runAxeSuite("accessibility [high-contrast]", { forcedColors: "active" });
