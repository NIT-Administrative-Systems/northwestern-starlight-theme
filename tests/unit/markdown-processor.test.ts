import { describe, expect, it, vi } from "vitest";
import {
    addRehypePlugin,
    isUnifiedProcessor,
    type MarkdownProcessorLike,
    withUnifiedProcessor,
} from "../../packages/northwestern-starlight-theme/src/markdown-processor.ts";

/** Stand-in for a `satteri()` processor: a different plugin system entirely. */
function satteriProcessor(
    overrides: { hastPlugins?: unknown[]; mdastPlugins?: unknown[] } = {},
): MarkdownProcessorLike {
    return {
        name: "satteri",
        options: { hastPlugins: overrides.hastPlugins ?? [], mdastPlugins: overrides.mdastPlugins ?? [] },
        createRenderer: vi.fn(),
    };
}

describe("withUnifiedProcessor", () => {
    it("installs a unified processor when the config has none", () => {
        const markdown = withUnifiedProcessor(undefined);

        expect(markdown.processor?.name).toBe("unified");
        expect(isUnifiedProcessor(markdown.processor)).toBe(true);
    });

    it("carries over remarkRehype, gfm, and smartypants", () => {
        const markdown = withUnifiedProcessor({
            remarkRehype: { footnoteLabel: "Notes" },
            gfm: false,
            smartypants: false,
        });

        expect(markdown.processor?.options).toMatchObject({
            remarkRehype: { footnoteLabel: "Notes" },
            gfm: false,
            smartypants: false,
        });
    });

    it("does not copy the top-level plugin arrays into the processor", () => {
        // Astro migrates the deprecated top-level arrays onto a unified processor
        // itself; copying them here would run every user plugin twice.
        const remarkPlugin = () => {};
        const rehypePlugin = () => {};
        const markdown = withUnifiedProcessor({ remarkPlugins: [remarkPlugin], rehypePlugins: [rehypePlugin] });

        expect(markdown.remarkPlugins).toEqual([remarkPlugin]);
        expect(markdown.rehypePlugins).toEqual([rehypePlugin]);
        expect(markdown.processor?.options?.remarkPlugins).toEqual([]);
        expect(markdown.processor?.options?.rehypePlugins).toEqual([]);
    });

    it("keeps a processor the consumer supplied", () => {
        const processor = withUnifiedProcessor(undefined).processor;
        const warn = vi.fn();

        expect(withUnifiedProcessor({ processor }, warn).processor).toBe(processor);
        expect(warn).not.toHaveBeenCalled();
    });

    it("keeps a non-unified processor but warns that theme features need unified", () => {
        const processor = satteriProcessor();
        const warn = vi.fn();

        const markdown = withUnifiedProcessor({ processor }, warn);

        expect(markdown.processor).toBe(processor);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("satteri()"));
    });
});

describe("addRehypePlugin", () => {
    const plugin = () => {};

    it("extends the live unified processor instead of replacing it", () => {
        const markdown = withUnifiedProcessor(undefined);
        const processor = markdown.processor as MarkdownProcessorLike & { options: { rehypePlugins: unknown[] } };
        const foreignPlugin = () => {};
        processor.options.rehypePlugins.push(foreignPlugin);

        const patch = addRehypePlugin(markdown, plugin);

        expect(patch).toBeUndefined();
        expect(markdown.processor).toBe(processor);
        expect(processor.options.rehypePlugins).toEqual([foreignPlugin, plugin]);
    });

    it("does not register the same plugin twice", () => {
        const markdown = withUnifiedProcessor(undefined);
        addRehypePlugin(markdown, plugin);
        addRehypePlugin(markdown, plugin);

        expect(markdown.processor?.options?.rehypePlugins).toEqual([plugin]);
    });

    it("falls back to the top-level array on Astro versions without markdown.processor", () => {
        const existing = () => {};

        expect(addRehypePlugin({ rehypePlugins: [existing] }, plugin)).toEqual({ rehypePlugins: [existing, plugin] });
    });

    it("leaves a non-unified processor alone and reports what a swap would drop", () => {
        const processor = satteriProcessor({ hastPlugins: [{}], mdastPlugins: [{}] });
        const createRenderer = processor.createRenderer;
        const warn = vi.fn();

        const patch = addRehypePlugin({ processor }, plugin, warn);

        expect(patch).toBeUndefined();
        expect(processor.options?.hastPlugins).toHaveLength(1);
        expect(processor.createRenderer).toBe(createRenderer);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 plugin(s)"));
    });
});
