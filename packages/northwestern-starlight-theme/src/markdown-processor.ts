/**
 * Helpers for Astro's `markdown.processor` API.
 *
 * Astro 6.4 introduced `markdown.processor`, and Astro 7 changed its default
 * from `unified()` (`@astrojs/markdown-remark`) to `satteri()`
 * (`@astrojs/markdown-satteri`). Both are *live objects*: integrations and
 * Starlight plugins extend the Markdown pipeline by mutating the processor
 * instance they are handed — pushing into `processor.options.*Plugins`, or
 * wrapping `processor.createRenderer`.
 *
 * That makes processor **replacement** destructive. Anything registered on the
 * outgoing object is dropped, and because most registrations are optional
 * behaviour, the failure is silent: `starlight-links-validator` swapped for a
 * fresh processor simply validates zero links and reports success.
 *
 * The theme therefore installs a `unified()` processor in
 * `defineNorthwesternConfig()` — at `astro.config.*` evaluation time, before
 * `starlight()` is constructed and before any plugin can observe the default —
 * and from then on only ever *extends* the processor it is given.
 */

import { unified } from "@astrojs/markdown-remark";

/**
 * Structural shape of `markdown.processor`.
 *
 * Declared locally because `AstroUserConfig["markdown"]` only gained the
 * `processor` key in Astro 6.4, and the theme supports Astro 5 and 6 as well.
 */
export interface MarkdownProcessorLike {
    name: string;
    options?: {
        remarkPlugins?: unknown[];
        rehypePlugins?: unknown[];
        mdastPlugins?: unknown[];
        hastPlugins?: unknown[];
        [key: string]: unknown;
    };
    createRenderer?: unknown;
}

/**
 * Structural shape of `markdown` in an Astro config, including the keys the
 * installed Astro version may not know about yet.
 */
export interface MarkdownConfigLike {
    processor?: MarkdownProcessorLike;
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    remarkRehype?: Record<string, unknown>;
    gfm?: boolean;
    smartypants?: unknown;
    [key: string]: unknown;
}

/** A `unified()` processor from `@astrojs/markdown-remark`. */
export function isUnifiedProcessor(
    processor: MarkdownProcessorLike | undefined,
): processor is MarkdownProcessorLike & { options: { rehypePlugins: unknown[] } } {
    return processor?.name === "unified" && Array.isArray(processor.options?.rehypePlugins);
}

/**
 * Plugins registered against a non-`unified` processor (Sätteri's `mdastPlugins`
 * / `hastPlugins`).
 *
 * These use a different plugin system than remark/rehype — a visitor object from
 * `defineHastPlugin()`, not a unified transformer — so they cannot be carried
 * across when a processor is replaced. Counting them is how the theme detects
 * that a replacement would silently drop somebody else's work.
 */
function countProcessorPlugins(processor: MarkdownProcessorLike): number {
    const { mdastPlugins, hastPlugins } = processor.options ?? {};
    return (
        (Array.isArray(mdastPlugins) ? mdastPlugins.length : 0) + (Array.isArray(hastPlugins) ? hastPlugins.length : 0)
    );
}

/**
 * Return a `markdown` config that is guaranteed to use a `unified()` processor.
 *
 * Call this while building the Astro config — before `starlight()` runs — so no
 * plugin ever observes the Sätteri default. A processor the consumer supplied
 * themselves is respected as-is (a non-`unified` one earns a warning, because
 * several Starlight plugins the theme ships with only support `unified`).
 *
 * User-supplied `remarkPlugins` / `rehypePlugins` are deliberately *not* copied
 * into the processor: Astro migrates those deprecated top-level arrays onto a
 * `unified` processor itself (exactly once, tracked internally), and on Astro
 * versions without `markdown.processor` they are the whole pipeline. Baking
 * copies in here would run them twice.
 */
export function withUnifiedProcessor(
    markdown: MarkdownConfigLike | undefined,
    warn: (message: string) => void = console.warn,
): MarkdownConfigLike {
    const config = markdown ?? {};

    if (config.processor) {
        if (!isUnifiedProcessor(config.processor)) {
            warn(
                `[northwestern-starlight-theme] \`markdown.processor\` is set to \`${config.processor.name}()\`. ` +
                    "The theme's scrollable tables and Starlight plugins such as `starlight-image-zoom` require the " +
                    "`unified()` processor from `@astrojs/markdown-remark`. Remove `markdown.processor` to let the " +
                    "theme configure it, or set it to `unified({ ... })`.",
            );
        }

        return config;
    }

    return {
        ...config,
        processor: unified({
            remarkRehype: config.remarkRehype,
            gfm: config.gfm,
            smartypants: config.smartypants,
        } as Parameters<typeof unified>[0]) as MarkdownProcessorLike,
    };
}

/**
 * Register a rehype plugin on the active Markdown pipeline.
 *
 * Returns a `markdown` config patch to hand to `updateConfig()`, or `undefined`
 * when the plugin was added to the live processor and no config update is
 * needed. Mutating `processor.options` is how Astro itself extends a processor
 * after config resolution — the object identity survives config validation
 * precisely so that late registrations still apply.
 *
 * A non-`unified` processor is left alone. Replacing it here is what used to
 * discard Sätteri-registered plugins from unrelated Starlight plugins, so the
 * theme warns instead of swapping behind their back.
 */
export function addRehypePlugin(
    markdown: MarkdownConfigLike | undefined,
    plugin: unknown,
    warn: (message: string) => void = console.warn,
): MarkdownConfigLike | undefined {
    const config = markdown ?? {};
    const processor = config.processor;

    // Astro < 6.4: the top-level plugin arrays are the entire pipeline.
    if (!processor) {
        return { rehypePlugins: [...(config.rehypePlugins ?? []), plugin] };
    }

    if (isUnifiedProcessor(processor)) {
        if (!processor.options.rehypePlugins.includes(plugin)) {
            processor.options.rehypePlugins.push(plugin);
        }

        return undefined;
    }

    const registered = countProcessorPlugins(processor);
    warn(
        `[northwestern-starlight-theme] Markdown is rendered by the \`${processor.name}()\` processor, which the theme ` +
            "does not extend. Scrollable table wrappers are disabled for this build" +
            (registered > 0
                ? `, and converting the processor would drop ${registered} plugin(s) other integrations registered on it. `
                : ". ") +
            "Use `defineNorthwesternConfig()` (it installs a `unified()` processor for you) or set " +
            "`markdown.processor: unified({ ... })` from `@astrojs/markdown-remark`.",
    );

    return undefined;
}
