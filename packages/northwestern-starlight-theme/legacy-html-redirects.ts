import { readdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { legacyHtmlRedirectsOptionsSchema, validateSchema } from "./src/config-schema";

/**
 * Options for {@link generateLegacyHtmlRedirects} and the wrapped integration
 * in {@link legacyHtmlRedirectsIntegration}.
 */
export interface LegacyHtmlRedirectsOptions {
    /**
     * Project-relative path to the Markdown/MDX content root.
     *
     * @default "src/content/docs"
     */
    contentDir?: string;
}

const DEFAULT_CONTENT_DIR = "src/content/docs";
const MARKDOWN_EXTENSION = /\.(md|mdx)$/;
const INDEX_SUFFIX = "/index";
// Slugs Astro emits as flat `.html` files rather than `<slug>/index.html`.
// Generating a directory-form redirect at the same path collides with Astro's
// own write during the build. The `404` page is the one documented case.
const RESERVED_SLUGS = new Set(["404"]);

/**
 * Build a `{ "/<slug>.html": "/<slug>/" }` map for every Markdown/MDX page
 * under the content directory. Intended for sites migrated from VuePress, where
 * pages were served at `<slug>.html` instead of `<slug>/`. Pass the result into
 * Astro's `redirects` config — old external links then resolve to the new
 * canonical URL.
 *
 * Pair with {@link legacyHtmlRedirectsIntegration} so the generated redirect
 * pages preserve the URL hash fragment. Prefer
 * {@link defineNorthwesternConfig}'s `legacyHtmlRedirects` option, which wires
 * both together.
 *
 * Index files are mapped to their parent slug (e.g. `dev/fc/index.md` becomes
 * `/dev/fc.html → /dev/fc/`); the root `index.{md,mdx}` is skipped.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *     redirects: generateLegacyHtmlRedirects(),
 * });
 * ```
 */
export function generateLegacyHtmlRedirects(options: LegacyHtmlRedirectsOptions = {}): Record<string, string> {
    const { contentDir = DEFAULT_CONTENT_DIR } = validateSchema(
        legacyHtmlRedirectsOptionsSchema,
        options,
        "legacyHtmlRedirects options",
    );

    const redirects: Record<string, string> = {};

    for (const entry of readdirSync(contentDir, { recursive: true }) as string[]) {
        if (!MARKDOWN_EXTENSION.test(entry)) continue;

        const slug = entry.split(sep).join("/").replace(MARKDOWN_EXTENSION, "");
        if (slug === "index") continue;

        const canonical = slug.endsWith(INDEX_SUFFIX) ? slug.slice(0, -INDEX_SUFFIX.length) : slug;
        if (RESERVED_SLUGS.has(canonical)) continue;
        redirects[`/${canonical}.html`] = `/${canonical}/`;
    }

    return redirects;
}

/**
 * Astro integration that post-processes the static redirect pages produced for
 * `.html` sources so legacy deep links keep their URL hash.
 *
 * Two things happen after the build:
 * 1. **Flatten the directory layout.** Astro's default `directory` build format
 *    writes each redirect to `<path>.html/index.html`. GitHub Pages serves
 *    those via a 301 that appends a trailing slash — an unnecessary hop.
 *    Rewriting them as flat `<path>.html` files cuts the round-trip.
 * 2. **Preserve the URL hash.** Astro's redirect page uses a `<meta refresh>`
 *    tag, which drops the fragment because the target URL has none of its own.
 *    A small inline `<script>` calls `location.replace(target + location.hash)`
 *    first; the meta-refresh is wrapped in `<noscript>` as the no-JS fallback.
 *    Running both unconditionally races and loses the hash.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *     integrations: [legacyHtmlRedirectsIntegration()],
 *     redirects: generateLegacyHtmlRedirects(),
 * });
 * ```
 */
export function legacyHtmlRedirectsIntegration(): AstroIntegration {
    return {
        name: "northwestern-legacy-html-redirects",
        hooks: {
            "astro:build:done": ({ dir }) => {
                flattenHtmlRedirectDirs(fileURLToPath(dir));
            },
        },
    };
}

/** @internal — exposed for unit tests. */
export function flattenHtmlRedirectDirs(distDir: string): void {
    walk(distDir, ".");
}

function walk(root: string, rel: string): void {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const childRel = join(rel, entry.name);
        if (entry.name.endsWith(".html")) {
            flattenOne(root, childRel);
        } else {
            walk(root, childRel);
        }
    }
}

// Collapse `<root>/<rel>/index.html` → `<root>/<rel>` (a flat file), rewriting
// the redirect page so the URL hash survives the forward. Skips directories
// that don't look like an Astro-emitted redirect page (i.e. contain anything
// besides a single `index.html`) so unrelated `.html`-named directories are
// left alone.
function flattenOne(root: string, rel: string): void {
    const dirPath = join(root, rel);
    const contents = readdirSync(dirPath);
    if (contents.length !== 1 || contents[0] !== "index.html") return;

    const indexPath = join(dirPath, "index.html");
    const rewritten = rewriteRedirectPage(readFileSync(indexPath, "utf8"));
    writeFileSync(indexPath, rewritten);

    const tmpPath = join(root, `${rel}.__tmp`);
    renameSync(indexPath, tmpPath);
    rmdirSync(dirPath);
    renameSync(tmpPath, dirPath);
}

const META_REFRESH_TAG = /<meta\s+http-equiv="refresh"[^>]*>/i;
const META_REFRESH_URL = /url=([^"]+)"/i;
const HASH_FORWARD_SCRIPT = /<script>location\.replace\(/;

/**
 * Rewrite a static redirect page so forwarding preserves the URL hash.
 *
 * Returns the page unchanged if no `<meta http-equiv="refresh">` is present,
 * the tag is missing a `url=` target, or the page has already been rewritten.
 *
 * @internal — exposed for unit tests.
 */
export function rewriteRedirectPage(html: string): string {
    if (HASH_FORWARD_SCRIPT.test(html)) return html;

    const metaRefresh = html.match(META_REFRESH_TAG)?.[0];
    if (!metaRefresh) return html;

    const target = metaRefresh.match(META_REFRESH_URL)?.[1];
    if (!target) return html;

    const script = `<script>location.replace(${JSON.stringify(target)}+location.hash);</script>`;
    return html.replace(metaRefresh, `${script}<noscript>${metaRefresh}</noscript>`);
}
