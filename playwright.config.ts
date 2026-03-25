import { defineConfig, devices } from "@playwright/test";

const port = 4321;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
    snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "desktop-chromium",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1440, height: 1100 },
            },
        },
        {
            name: "mobile-chromium",
            use: {
                ...devices["Pixel 5"],
            },
        },
    ],
    webServer: {
        command: `pnpm --dir docs astro dev --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120000,
    },
});
