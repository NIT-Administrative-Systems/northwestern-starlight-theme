/**
 * Regression coverage for the Markdown pipeline seam.
 *
 * Astro 7 hands every integration and Starlight plugin a *live* Markdown
 * processor object, and plugins extend the pipeline by mutating it. Replacing
 * that object after the fact silently discards their work — the failure that
 * left `starlight-links-validator` reporting "All internal links are valid" on
 * sites that had broken links.
 *
 * These tests simulate the Astro/Starlight lifecycle around the theme:
 * config evaluation → Astro defaults → Starlight plugin `config:setup` →
 * `astro:config:setup` for every integration the theme registers.
 */

import type { AstroIntegration } from "astro";
import { describe, expect, it, vi } from "vitest";
import { defineNorthwesternConfig } from "../../packages/northwestern-starlight-theme/config.ts";
import northwesternTheme from "../../packages/northwestern-starlight-theme/index.ts";
import type {
    MarkdownConfigLike,
    MarkdownProcessorLike,
} from "../../packages/northwestern-starlight-theme/src/markdown-processor.ts";

/** Astro 7's default processor, which the theme must never let plugins see. */
function satteriProcessor(): MarkdownProcessorLike {
    return {
        name: "satteri",
        options: { mdastPlugins: [], hastPlugins: [] },
        createRenderer: () => ({ render: () => "" }),
    };
}

/**
 * Apply the Astro config defaults that matter here: an unset `markdown.processor`
 * becomes `satteri()` on Astro 7.
 */
function applyAstroDefaults(markdown: MarkdownConfigLike | undefined): MarkdownConfigLike {
    const config: MarkdownConfigLike = { remarkPlugins: [], rehypePlugins: [], ...markdown };
    config.processor ??= satteriProcessor();
    return config;
}

/**
 * How `starlight-links-validator` 0.25 registers itself: it mutates whichever
 * processor Starlight handed it, then counts the files it sees rendered.
 */
function registerLikeLinksValidator(processor: MarkdownProcessorLike) {
    const marker = () => {};

    if (processor.name === "satteri") {
        processor.options?.hastPlugins?.push(marker);
    } else {
        processor.options?.rehypePlugins?.push(marker);
    }

    const inner = processor.createRenderer as () => unknown;
    const patched = () => inner();
    processor.createRenderer = patched;

    return {
        isStillRegistered(current: MarkdownProcessorLike | undefined) {
            const plugins = [...(current?.options?.hastPlugins ?? []), ...(current?.options?.rehypePlugins ?? [])];
            return plugins.includes(marker) && current?.createRenderer === patched;
        },
    };
}

/** Merge an integration's `updateConfig()` patch the way Astro does. */
function mergeMarkdown(markdown: MarkdownConfigLike, patch: MarkdownConfigLike | undefined): MarkdownConfigLike {
    if (!patch) return markdown;

    return {
        ...markdown,
        ...patch,
        // Astro replaces `markdown.processor` wholesale and concatenates arrays.
        processor: patch.processor ?? markdown.processor,
        remarkPlugins: [...(markdown.remarkPlugins ?? []), ...(patch.remarkPlugins ?? [])],
        rehypePlugins: [...(markdown.rehypePlugins ?? []), ...(patch.rehypePlugins ?? [])],
    };
}

/** Run the theme's Starlight plugin and every integration it adds. */
async function runThemeLifecycle(markdown: MarkdownConfigLike) {
    const integrations: AstroIntegration[] = [];
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    await northwesternTheme({ mermaid: false, ogImage: false }).hooks["config:setup"]({
        config: { title: "Fixture" },
        updateConfig: vi.fn(),
        addIntegration: (integration: AstroIntegration) => integrations.push(integration),
        addRouteMiddleware: vi.fn(),
        logger,
        command: "build",
        isRestart: false,
        useTranslations: vi.fn(),
        absolutePathToLang: vi.fn(),
    } as never);

    let current = markdown;

    for (const integration of integrations) {
        await integration.hooks["astro:config:setup"]?.({
            config: { markdown: current, site: "https://example.northwestern.edu" },
            updateConfig: (patch: { markdown?: MarkdownConfigLike }) => {
                current = mergeMarkdown(current, patch.markdown);
            },
            injectRoute: vi.fn(),
            logger,
        } as never);
    }

    return { markdown: current, logger };
}

describe("Markdown processor handed to Starlight", () => {
    it("is already unified when the config helper builds the Astro config", () => {
        // The swap has to happen here — at `astro.config.*` evaluation time — because
        // `starlight()` below is constructed with plugins that read the processor.
        const config = defineNorthwesternConfig({
            site: "https://example.northwestern.edu",
            starlight: { title: "Fixture" },
            mermaid: false,
            legacyHtmlRedirects: false,
        });

        expect((config.markdown as MarkdownConfigLike | undefined)?.processor?.name).toBe("unified");
    });

    it("keeps a consumer's own processor", () => {
        const processor = satteriProcessor();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const config = defineNorthwesternConfig({
            site: "https://example.northwestern.edu",
            starlight: { title: "Fixture" },
            mermaid: false,
            legacyHtmlRedirects: false,
            markdown: { processor } as never,
        });

        expect((config.markdown as MarkdownConfigLike).processor).toBe(processor);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("satteri()"));
        warn.mockRestore();
    });
});

describe("plugin registrations survive the theme's integrations", () => {
    it("keeps what a Starlight plugin registered on the processor", async () => {
        const config = defineNorthwesternConfig({
            site: "https://example.northwestern.edu",
            starlight: { title: "Fixture" },
            mermaid: false,
            legacyHtmlRedirects: false,
        });
        const markdown = applyAstroDefaults(config.markdown as MarkdownConfigLike | undefined);

        // A Starlight plugin registers against the processor it was handed, the
        // way `starlight-links-validator` does, before the theme's integrations run.
        const validator = registerLikeLinksValidator(markdown.processor as MarkdownProcessorLike);

        const result = await runThemeLifecycle(markdown);

        expect(validator.isStillRegistered(result.markdown.processor)).toBe(true);
    });

    it("still wraps tables in the same pipeline", async () => {
        const config = defineNorthwesternConfig({
            site: "https://example.northwestern.edu",
            starlight: { title: "Fixture" },
            mermaid: false,
            legacyHtmlRedirects: false,
        });
        const markdown = applyAstroDefaults(config.markdown as MarkdownConfigLike | undefined);

        const result = await runThemeLifecycle(markdown);
        const registered = [
            ...(result.markdown.processor?.options?.rehypePlugins ?? []),
            ...(result.markdown.rehypePlugins ?? []),
        ].map((plugin) => (typeof plugin === "function" ? plugin.name : ""));

        expect(registered).toContain("rehypeTableScroll");
    });

    it("does not extend — or silently replace — a Sätteri processor", async () => {
        // Manual `northwesternTheme()` setups can still end up on Sätteri. Swapping
        // it here is what dropped other plugins' registrations, so the theme warns.
        const markdown = applyAstroDefaults(undefined);
        const validator = registerLikeLinksValidator(markdown.processor as MarkdownProcessorLike);

        const result = await runThemeLifecycle(markdown);

        expect(result.markdown.processor?.name).toBe("satteri");
        expect(validator.isStillRegistered(result.markdown.processor)).toBe(true);
        expect(result.logger.warn).toHaveBeenCalledWith(expect.stringContaining("satteri()"));
    });
});
