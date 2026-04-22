import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    flattenHtmlRedirectDirs,
    generateLegacyHtmlRedirects,
    legacyHtmlRedirectsIntegration,
    rewriteRedirectPage,
} from "../../packages/northwestern-starlight-theme/legacy-html-redirects.ts";

/**
 * Build a disposable directory tree rooted at a temp path. Each key in `files`
 * is a forward-slash relative path; directories are created automatically.
 */
function makeTree(root: string, files: Record<string, string>): void {
    for (const [relPath, contents] of Object.entries(files)) {
        const fullPath = join(root, relPath);
        mkdirSync(join(fullPath, ".."), { recursive: true });
        writeFileSync(fullPath, contents);
    }
}

function makeRedirectHtml(target: string): string {
    return [
        `<!doctype html><title>Redirecting to: ${target}</title>`,
        `<meta http-equiv="refresh" content="0;url=${target}">`,
        `<link rel="canonical" href="https://example.com${target}">`,
        `<body><a href="${target}">Redirecting to <code>${target}</code></a></body>`,
    ].join("");
}

describe("generateLegacyHtmlRedirects", () => {
    let tempDir: string;
    const originalCwd = process.cwd();

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "nu-legacy-redirects-"));
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        rmSync(tempDir, { recursive: true, force: true });
    });

    it("maps top-level and nested pages to `.html → /` redirects", () => {
        makeTree(tempDir, {
            "src/content/docs/ops/jira.md": "# Jira",
            "src/content/docs/dev/fc/simplek.md": "# Simplek",
        });

        expect(generateLegacyHtmlRedirects()).toEqual({
            "/ops/jira.html": "/ops/jira/",
            "/dev/fc/simplek.html": "/dev/fc/simplek/",
        });
    });

    it("treats `<dir>/index.md` as the parent slug, not a nested `/index` route", () => {
        makeTree(tempDir, {
            "src/content/docs/dev/fc/index.md": "# FC",
            "src/content/docs/dev/fc/simplek.md": "# Simplek",
        });

        const redirects = generateLegacyHtmlRedirects();
        expect(redirects["/dev/fc.html"]).toBe("/dev/fc/");
        expect(redirects).not.toHaveProperty("/dev/fc/index.html");
    });

    it("skips `404.{md,mdx}` since Astro emits `/404.html` as a flat file itself", () => {
        makeTree(tempDir, {
            "src/content/docs/404.md": "# Not found",
            "src/content/docs/guide.md": "# Guide",
        });

        const redirects = generateLegacyHtmlRedirects();
        expect(redirects).toEqual({ "/guide.html": "/guide/" });
        expect(redirects).not.toHaveProperty("/404.html");
    });

    it("skips the root `index.{md,mdx}` since `/index.html` has no canonical target", () => {
        makeTree(tempDir, {
            "src/content/docs/index.mdx": "# Home",
            "src/content/docs/about.md": "# About",
        });

        const redirects = generateLegacyHtmlRedirects();
        expect(redirects).toEqual({ "/about.html": "/about/" });
        expect(redirects).not.toHaveProperty("/index.html");
        expect(redirects).not.toHaveProperty("/.html");
    });

    it("handles .md and .mdx uniformly", () => {
        makeTree(tempDir, {
            "src/content/docs/a.md": "# A",
            "src/content/docs/b.mdx": "# B",
        });

        expect(generateLegacyHtmlRedirects()).toEqual({
            "/a.html": "/a/",
            "/b.html": "/b/",
        });
    });

    it("ignores non-content files that happen to live under the content dir", () => {
        makeTree(tempDir, {
            "src/content/docs/page.md": "# Page",
            "src/content/docs/image.png": "binary",
            "src/content/docs/notes.txt": "text",
            "src/content/docs/config.json": "{}",
        });

        expect(generateLegacyHtmlRedirects()).toEqual({ "/page.html": "/page/" });
    });

    it("returns an empty map when the content directory has no pages", () => {
        makeTree(tempDir, { "src/content/docs/.keep": "" });
        expect(generateLegacyHtmlRedirects()).toEqual({});
    });

    it("accepts a custom content directory", () => {
        makeTree(tempDir, {
            "docs/guide.md": "# Guide",
            "src/content/docs/ignored.md": "# Ignored",
        });

        expect(generateLegacyHtmlRedirects({ contentDir: "docs" })).toEqual({
            "/guide.html": "/guide/",
        });
    });

    it("rejects unknown options at the schema boundary", () => {
        expect(() =>
            generateLegacyHtmlRedirects({ typo: "src/content/docs" } as unknown as { contentDir: string }),
        ).toThrow(/legacyHtmlRedirects options/);
    });
});

describe("rewriteRedirectPage", () => {
    it("inserts a hash-preserving script and wraps meta-refresh in <noscript>", () => {
        const input = makeRedirectHtml("/dev/fc/simplek/");
        const output = rewriteRedirectPage(input);

        expect(output).toContain(`<script>location.replace("/dev/fc/simplek/"+location.hash);</script>`);
        expect(output).toContain(`<noscript><meta http-equiv="refresh" content="0;url=/dev/fc/simplek/"></noscript>`);
        // The raw meta-refresh must no longer exist outside <noscript>
        expect(output).not.toMatch(/(^|[^>])<meta\s+http-equiv="refresh"/);
    });

    it("uses JSON.stringify to emit a quoted, JS-safe redirect target", () => {
        const input = makeRedirectHtml("/dev/fc/simplek/");
        const output = rewriteRedirectPage(input);
        // Target is wrapped in double quotes (JSON.stringify default) rather
        // than single quotes or concatenation.
        expect(output).toContain(`location.replace("/dev/fc/simplek/"+location.hash);`);
    });

    it("returns the page unchanged when there is no meta-refresh tag", () => {
        const input = "<!doctype html><title>Normal page</title><body>Hello</body>";
        expect(rewriteRedirectPage(input)).toBe(input);
    });

    it("returns the page unchanged when the meta-refresh has no url= value", () => {
        const input = `<!doctype html><meta http-equiv="refresh" content="0">`;
        expect(rewriteRedirectPage(input)).toBe(input);
    });

    it("is idempotent — running twice does not double-wrap", () => {
        const input = makeRedirectHtml("/dev/fc/simplek/");
        const once = rewriteRedirectPage(input);
        const twice = rewriteRedirectPage(once);
        expect(twice).toBe(once);
    });
});

describe("flattenHtmlRedirectDirs", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "nu-legacy-flatten-"));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it("flattens `<path>.html/index.html` into a `<path>.html` file and rewrites it", () => {
        makeTree(tempDir, {
            "dev/fc/simplek.html/index.html": makeRedirectHtml("/dev/fc/simplek/"),
        });

        flattenHtmlRedirectDirs(tempDir);

        const flattened = readFileSync(join(tempDir, "dev/fc/simplek.html"), "utf8");
        expect(flattened).toContain("<script>location.replace");
        expect(flattened).toContain("<noscript>");
    });

    it("leaves canonical pages (`<path>/index.html`) untouched", () => {
        const canonical = "<!doctype html><body>Simplek page</body>";
        makeTree(tempDir, {
            "dev/fc/simplek.html/index.html": makeRedirectHtml("/dev/fc/simplek/"),
            "dev/fc/simplek/index.html": canonical,
        });

        flattenHtmlRedirectDirs(tempDir);

        expect(readFileSync(join(tempDir, "dev/fc/simplek/index.html"), "utf8")).toBe(canonical);
        expect(readdirSync(join(tempDir, "dev/fc"))).toEqual(expect.arrayContaining(["simplek", "simplek.html"]));
    });

    it("walks deeply nested redirect pages", () => {
        makeTree(tempDir, {
            "a/b/c/d/deep.html/index.html": makeRedirectHtml("/a/b/c/d/deep/"),
        });

        flattenHtmlRedirectDirs(tempDir);

        expect(readFileSync(join(tempDir, "a/b/c/d/deep.html"), "utf8")).toContain("location.replace");
    });

    it("does not touch `.html`-named directories that are not Astro redirect emissions", () => {
        makeTree(tempDir, {
            "weird.html/extra.txt": "not a redirect",
            "weird.html/index.html": "<html>something</html>",
        });

        flattenHtmlRedirectDirs(tempDir);

        expect(readdirSync(join(tempDir, "weird.html")).sort()).toEqual(["extra.txt", "index.html"]);
    });

    it("is a no-op on a tree with no `.html` directories", () => {
        makeTree(tempDir, {
            "index.html": "<html>home</html>",
            "about/index.html": "<html>about</html>",
        });

        flattenHtmlRedirectDirs(tempDir);

        expect(readFileSync(join(tempDir, "index.html"), "utf8")).toBe("<html>home</html>");
        expect(readFileSync(join(tempDir, "about/index.html"), "utf8")).toBe("<html>about</html>");
    });
});

describe("legacyHtmlRedirectsIntegration", () => {
    it("registers an astro:build:done hook under a unique name", () => {
        const integration = legacyHtmlRedirectsIntegration();
        expect(integration.name).toBe("northwestern-legacy-html-redirects");
        expect(integration.hooks).toHaveProperty("astro:build:done");
    });

    it("runs the flatten pass against the build output directory", () => {
        const tempDir = mkdtempSync(join(tmpdir(), "nu-legacy-hook-"));
        try {
            makeTree(tempDir, {
                "ops/jira.html/index.html": makeRedirectHtml("/ops/jira/"),
            });

            const integration = legacyHtmlRedirectsIntegration();
            const hook = integration.hooks["astro:build:done"];
            expect(hook).toBeDefined();
            // The Astro hook type has many required fields; only `dir` is used here.
            (hook as unknown as (params: { dir: URL }) => void)({ dir: pathToFileURL(`${tempDir}/`) });

            expect(readFileSync(join(tempDir, "ops/jira.html"), "utf8")).toContain("location.replace");
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
