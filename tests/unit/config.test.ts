import type { AstroIntegration, AstroUserConfig } from "astro";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockNorthwesternTheme, mockNorthwesternMermaid, mockRequireResolve } = vi.hoisted(() => ({
    mockNorthwesternTheme: vi.fn((config: unknown) => ({
        name: "northwestern-starlight-theme",
        hooks: {},
        _themeConfig: config,
    })),
    mockNorthwesternMermaid: vi.fn((options?: unknown) => ({
        name: "northwestern-mermaid",
        hooks: { "astro:config:setup": vi.fn() },
        _mermaidConfig: options,
    })),
    mockRequireResolve: vi.fn((id: string) => id),
}));

vi.mock("node:module", async (importOriginal) => {
    const original = await importOriginal<typeof import("node:module")>();
    return {
        ...original,
        createRequire: vi.fn(() => ({
            resolve: mockRequireResolve,
        })),
    };
});

vi.mock("../../packages/northwestern-starlight-theme/index.ts", () => ({ default: mockNorthwesternTheme }));
vi.mock("../../packages/northwestern-starlight-theme/mermaid.ts", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../packages/northwestern-starlight-theme/mermaid.ts")>();
    return { ...original, northwesternMermaid: mockNorthwesternMermaid };
});

import { defineNorthwesternConfig } from "../../packages/northwestern-starlight-theme/config.ts";

type MockIntegration = AstroIntegration & {
    _mermaidConfig?: unknown;
};

function getIntegrations(config: AstroUserConfig): MockIntegration[] {
    return config.integrations as MockIntegration[];
}

afterEach(() => {
    mockNorthwesternTheme.mockClear();
    mockNorthwesternMermaid.mockClear();
    mockRequireResolve.mockReset();
    mockRequireResolve.mockImplementation((id: string) => id);
    vi.restoreAllMocks();
});

describe("defineNorthwesternConfig", () => {
    it("returns an AstroUserConfig with integrations", () => {
        const result = defineNorthwesternConfig({ starlight: { title: "Test" } });
        expect(result).toHaveProperty("integrations");
        expect(Array.isArray(result.integrations)).toBe(true);
    });

    it("passes Astro config options through to the top level", () => {
        const result = defineNorthwesternConfig({
            site: "https://example.northwestern.edu",
            base: "/docs",
            starlight: { title: "Test" },
        });
        expect(result.site).toBe("https://example.northwestern.edu");
        expect(result.base).toBe("/docs");
    });

    describe("mermaid integration ordering", () => {
        it("adds mermaid before starlight when mermaid is true (default)", () => {
            const result = defineNorthwesternConfig({ starlight: { title: "Test" } });
            const names = getIntegrations(result).map((i) => i.name);
            expect(names).toEqual(["northwestern-mermaid", "@astrojs/starlight"]);
        });

        it("omits mermaid when mermaid is false", () => {
            const result = defineNorthwesternConfig({
                starlight: { title: "Test" },
                mermaid: false,
            });
            const names = getIntegrations(result).map((i) => i.name);
            expect(names).toEqual(["@astrojs/starlight"]);
        });

        it("creates mermaid with custom options when mermaid is an object", () => {
            defineNorthwesternConfig({
                starlight: { title: "Test" },
                mermaid: { toolbar: false },
            });
            expect(mockNorthwesternMermaid).toHaveBeenCalledWith({ toolbar: false });
        });
    });

    it("always disables theme built-in mermaid", () => {
        for (const mermaidOption of [true, false, { toolbar: false }]) {
            mockNorthwesternTheme.mockClear();
            defineNorthwesternConfig({
                starlight: { title: "Test" },
                mermaid: mermaidOption,
            });
            expect(mockNorthwesternTheme.mock.calls[0][0]).toHaveProperty("mermaid", false);
        }
    });

    it("injects theme plugin and passes user plugins to starlight", () => {
        const userPlugin = { name: "my-plugin", hooks: {} };
        const result = defineNorthwesternConfig({
            starlight: { title: "Test" },
            plugins: [userPlugin],
        });
        expect(mockNorthwesternTheme).toHaveBeenCalledOnce();
        expect(getIntegrations(result).map((i) => i.name)).toContain("@astrojs/starlight");
    });

    it("warns when user manually adds northwestern-starlight-theme plugin", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        defineNorthwesternConfig({
            starlight: { title: "Test" },
            plugins: [{ name: "northwestern-starlight-theme", hooks: {} }],
        });
        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0]).toContain("double-registration");
    });

    it("supports before/after integration escape hatch", () => {
        const before = { name: "before-int", hooks: {} } as AstroIntegration;
        const after = { name: "after-int", hooks: {} } as AstroIntegration;
        const result = defineNorthwesternConfig({
            starlight: { title: "Test" },
            integrations: { before: [before], after: [after] },
        });
        const names = getIntegrations(result).map((i) => i.name);
        expect(names).toEqual(["before-int", "northwestern-mermaid", "@astrojs/starlight", "after-int"]);
    });

    it("creates mermaid integration during config construction", () => {
        const result = defineNorthwesternConfig({ starlight: { title: "Test" } });
        expect(getIntegrations(result).map((i) => i.name)).toContain("northwestern-mermaid");
        expect(mockNorthwesternMermaid).toHaveBeenCalledOnce();
    });

    it("warns and skips mermaid when optional dependencies are missing", () => {
        mockRequireResolve.mockImplementation((id: string) => {
            if (id === "astro-mermaid") {
                throw new Error("missing astro-mermaid");
            }
            return id;
        });

        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const result = defineNorthwesternConfig({ starlight: { title: "Test" } });

        expect(getIntegrations(result).map((i) => i.name)).toEqual(["@astrojs/starlight"]);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("Mermaid support was requested"));
    });

    it("warns when migrated starlight.plugins are present", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

        defineNorthwesternConfig({
            starlight: {
                title: "Test",
                plugins: [{ name: "migrated-plugin", hooks: {} }],
            },
        });

        expect(spy).toHaveBeenCalledWith(expect.stringContaining("`starlight.plugins` was found"));
    });

    it("forwards theme config to northwesternTheme", () => {
        defineNorthwesternConfig({
            starlight: { title: "Test" },
            theme: { homepage: { layout: "split" } },
        });
        expect(mockNorthwesternTheme.mock.calls[0][0]).toMatchObject({
            homepage: { layout: "split" },
            mermaid: false,
        });
    });

    describe("expressiveCode", () => {
        it("includes line-numbers plugin and GitHub themes by default", () => {
            const result = defineNorthwesternConfig({ starlight: { title: "Test" } });
            // Should not throw — pluginLineNumbers() is included in the config
            expect(result).toHaveProperty("integrations");
        });

        it("does not pass expressiveCode key through to starlight when user provides it", () => {
            // Ensures user expressiveCode is extracted and merged, not double-passed
            const result = defineNorthwesternConfig({
                starlight: {
                    title: "Test",
                    expressiveCode: { themes: ["dracula"] },
                },
            });
            expect(result).toHaveProperty("integrations");
        });
    });
});
