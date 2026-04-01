import { describe, expect, it, vi } from "vitest";
import {
    createNorthwesternMermaidConfig,
    darkMermaidConfig,
    defaultMermaidConfig,
    northwesternMermaid,
} from "../../packages/northwestern-starlight-theme/mermaid.ts";

/** Minimal mock of Astro's config:setup hook params. */
function makeHookParams() {
    return {
        config: { root: new URL("file:///tmp/"), srcDir: new URL("file:///tmp/src/") },
        command: "build" as const,
        isRestart: false,
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            fork: vi.fn().mockReturnValue({
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn(),
                fork: vi.fn(),
                options: vi.fn(),
                label: "fork",
            }),
            options: vi.fn(),
            label: "test",
        },
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        updateConfig: vi.fn(),
        addMiddleware: vi.fn(),
        addClientDirective: vi.fn(),
        addDevToolbarApp: vi.fn(),
        createCodegenDir: vi.fn(),
    };
}

describe("createNorthwesternMermaidConfig", () => {
    it("returns light config with base theme and Northwestern purple", () => {
        const config = createNorthwesternMermaidConfig("light");
        expect(config.theme).toBe("base");
        expect(config.autoTheme).toBe(false);
        expect(config.mermaidConfig?.themeVariables).toHaveProperty("primaryColor", "#4e2a84");
    });

    it("returns dark config with lighter primary color", () => {
        const config = createNorthwesternMermaidConfig("dark");
        const vars = config.mermaidConfig?.themeVariables as Record<string, unknown>;
        expect(vars.primaryColor).not.toBe("#4e2a84");
        expect(vars.background).toBe("#1c1c1f");
    });

    it("produces different canvas/text/surface values for light vs dark", () => {
        const light = createNorthwesternMermaidConfig("light");
        const dark = createNorthwesternMermaidConfig("dark");
        const lightVars = light.mermaidConfig?.themeVariables as Record<string, unknown>;
        const darkVars = dark.mermaidConfig?.themeVariables as Record<string, unknown>;

        expect(lightVars.background).not.toBe(darkVars.background);
        expect(lightVars.textColor).not.toBe(darkVars.textColor);
    });

    it("generates indexed git and pie variables from chart palette", () => {
        const config = createNorthwesternMermaidConfig("light");
        const vars = config.mermaidConfig?.themeVariables as Record<string, unknown>;

        for (let i = 0; i < 8; i++) {
            expect(vars).toHaveProperty(`git${i}`);
        }
        for (let i = 1; i <= 8; i++) {
            expect(vars).toHaveProperty(`pie${i}`);
        }
    });
});

describe("defaultMermaidConfig / darkMermaidConfig", () => {
    it("are valid config objects with expected structure", () => {
        expect(defaultMermaidConfig).toHaveProperty("theme", "base");
        expect(defaultMermaidConfig).toHaveProperty("mermaidConfig");
        expect(defaultMermaidConfig.mermaidConfig).toHaveProperty("themeVariables");

        expect(darkMermaidConfig).toHaveProperty("theme", "base");
        expect(darkMermaidConfig).toHaveProperty("mermaidConfig");
        expect(darkMermaidConfig.mermaidConfig).toHaveProperty("themeVariables");
    });

    it("have different primary colors between light and dark", () => {
        const lightPrimary = (defaultMermaidConfig.mermaidConfig?.themeVariables as Record<string, unknown>)
            ?.primaryColor;
        const darkPrimary = (darkMermaidConfig.mermaidConfig?.themeVariables as Record<string, unknown>)?.primaryColor;
        expect(lightPrimary).not.toBe(darkPrimary);
    });
});

describe("northwesternMermaid", () => {
    it("returns an integration named northwestern-mermaid", () => {
        const integration = northwesternMermaid();
        expect(integration.name).toBe("northwestern-mermaid");
        expect(integration.hooks).toHaveProperty("astro:config:setup");
    });

    it("passes toolbar=false into injected script", () => {
        const integration = northwesternMermaid({ toolbar: false });
        const params = makeHookParams();
        integration.hooks["astro:config:setup"]?.(params as never);

        expect(params.injectScript).toHaveBeenCalled();
        const scriptContent = params.injectScript.mock.calls[0][1] as string;
        expect(scriptContent).toContain("__NU_MERMAID_TOOLBAR__ = false");
    });

    it("passes toolbar=true by default into injected script", () => {
        const integration = northwesternMermaid();
        const params = makeHookParams();
        integration.hooks["astro:config:setup"]?.(params as never);

        expect(params.injectScript).toHaveBeenCalled();
        const scriptContent = params.injectScript.mock.calls[0][1] as string;
        expect(scriptContent).toContain("__NU_MERMAID_TOOLBAR__ = true");
    });

    it("merges user themeVariables on top of defaults", () => {
        const integration = northwesternMermaid({
            mermaidConfig: {
                themeVariables: { primaryColor: "#ff0000" },
            },
        });
        const params = makeHookParams();
        integration.hooks["astro:config:setup"]?.(params as never);

        const scriptContent = params.injectScript.mock.calls[0][1] as string;
        const configMatch = scriptContent.match(/__NU_MERMAID_CONFIGS__ = ({.*})/s);
        expect(configMatch).not.toBeNull();

        const configs = JSON.parse(configMatch![1]);
        expect(configs.light.themeVariables.primaryColor).toBe("#ff0000");
        expect(configs.light.themeVariables).toHaveProperty("background");
        expect(configs.light.themeVariables).toHaveProperty("textColor");
    });
});
