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

function getLastInjectedScript(params: ReturnType<typeof makeHookParams>): string {
    const lastCall = params.injectScript.mock.calls.at(-1);
    return lastCall?.[1] as string;
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

    it("passes toolbar=false into injected script", async () => {
        const integration = northwesternMermaid({ toolbar: false });
        const params = makeHookParams();
        await integration.hooks["astro:config:setup"]?.(params as never);

        expect(params.injectScript).toHaveBeenCalled();
        const scriptContent = getLastInjectedScript(params);
        expect(scriptContent).toContain("__NU_MERMAID_TOOLBAR__ = false");
    });

    it("passes toolbar=true by default into injected script", async () => {
        const integration = northwesternMermaid();
        const params = makeHookParams();
        await integration.hooks["astro:config:setup"]?.(params as never);

        expect(params.injectScript).toHaveBeenCalled();
        const scriptContent = getLastInjectedScript(params);
        expect(scriptContent).toContain("__NU_MERMAID_TOOLBAR__ = true");
    });

    it("never swaps the Markdown processor out from under other plugins", async () => {
        // `astro-mermaid` extends whichever processor is configured. The theme used
        // to replace a Sätteri processor here, discarding everything Starlight
        // plugins had registered on it (e.g. starlight-links-validator).
        const processor = {
            name: "satteri",
            options: { mdastPlugins: [], hastPlugins: [{}] },
            createRenderer: vi.fn(),
        };
        const integration = northwesternMermaid();
        const params = makeHookParams();
        Object.assign(params.config, {
            markdown: { processor, remarkPlugins: [], rehypePlugins: [], remarkRehype: {} },
        });

        await integration.hooks["astro:config:setup"]?.(params as never);

        const swappedToUnified = params.updateConfig.mock.calls.some(
            ([update]) =>
                (update as { markdown?: { processor?: { name?: string } } })?.markdown?.processor?.name === "unified",
        );
        expect(swappedToUnified).toBe(false);
        expect(processor.options.hastPlugins).toHaveLength(1);
    });

    it("merges user themeVariables on top of defaults", async () => {
        const integration = northwesternMermaid({
            mermaidConfig: {
                themeVariables: { primaryColor: "#ff0000" },
            },
        });
        const params = makeHookParams();
        await integration.hooks["astro:config:setup"]?.(params as never);

        const scriptContent = getLastInjectedScript(params);
        const configMatch = scriptContent.match(/__NU_MERMAID_CONFIGS__ = ({.*})/s);
        expect(configMatch).not.toBeNull();

        const configs = JSON.parse(configMatch![1]);
        expect(configs.light.themeVariables.primaryColor).toBe("#ff0000");
        expect(configs.light.themeVariables).toHaveProperty("background");
        expect(configs.light.themeVariables).toHaveProperty("textColor");
    });
});

type Mode = "light" | "dark";

function themeVars(mode: Mode): Record<string, string> {
    return createNorthwesternMermaidConfig(mode).mermaidConfig?.themeVariables as Record<string, string>;
}

/** WCAG 2 relative luminance of a #rgb or #rrggbb color. */
function luminance(color: string): number {
    const hex = color.length === 4 ? `#${[...color.slice(1)].map((c) => c + c).join("")}` : color;
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("Mermaid 12 appearance", () => {
    it.each<Mode>(["light", "dark"])(
        "sets theme, look, layout and flowchart sizing inside mermaidConfig (%s)",
        (mode) => {
            // mermaid.initialize() resets keys it is not given, so the toolbar's
            // re-render needs these in the config it passes, not only astro-mermaid's.
            expect(createNorthwesternMermaidConfig(mode).mermaidConfig).toMatchObject({
                theme: "base",
                look: "classic",
                layout: "dagre",
                flowchart: { minNodeWidth: 0, wrappingWidth: 200 },
            });
        },
    );

    it("lets a site opt back into Mermaid 12's neo look and ELK layout", async () => {
        const integration = northwesternMermaid({ mermaidConfig: { look: "neo", layout: "elk" } });
        const params = makeHookParams();
        await integration.hooks["astro:config:setup"]?.(params as never);

        const configs = JSON.parse(getLastInjectedScript(params).match(/__NU_MERMAID_CONFIGS__ = ({.*})/s)![1]);
        expect(configs.dark).toMatchObject({ theme: "base", look: "neo", layout: "elk" });
    });

    it("uses Mermaid's quadrantNFill variable names", () => {
        const vars = themeVars("light");
        for (let i = 1; i <= 4; i++) {
            expect(vars).toHaveProperty(`quadrant${i}Fill`);
            expect(vars).toHaveProperty(`quadrant${i}TextFill`);
        }
    });

    it("colors C4 elements from the Northwestern palette", () => {
        const c4 = createNorthwesternMermaidConfig("light").mermaidConfig?.c4 as Record<string, string>;
        expect(c4.system_bg_color).toBe("#4e2a84");
        // C4 always draws white labels.
        for (const [key, value] of Object.entries(c4)) {
            if (key.endsWith("_bg_color")) expect(contrast(value, "#ffffff"), key).toBeGreaterThanOrEqual(4.5);
        }
    });
});

describe("Mermaid palette contrast", () => {
    it.each<Mode>(["light", "dark"])("puts text on fills at WCAG AA or better (%s)", (mode) => {
        const v = themeVars(mode);
        const pairs: [string, string][] = [
            ["primaryColor", "primaryTextColor"],
            ["secondaryColor", "secondaryTextColor"],
            ["tertiaryColor", "tertiaryTextColor"],
            ["actorBkg", "actorTextColor"],
            ["noteBkgColor", "noteTextColor"],
            ["stateBkg", "stateLabelColor"],
            ["requirementBackground", "requirementTextColor"],
            ["taskBkgColor", "taskTextColor"],
            ["critBkgColor", "taskTextColor"],
            ["activeTaskBkgColor", "taskTextDarkColor"],
            ["doneTaskBkgColor", "taskTextDarkColor"],
            ["background", "textColor"],
            ...Array.from({ length: 12 }, (_, i): [string, string] => [`cScale${i}`, `cScaleLabel${i}`]),
            ...Array.from({ length: 4 }, (_, i): [string, string] => [
                `quadrant${i + 1}Fill`,
                `quadrant${i + 1}TextFill`,
            ]),
            ...Array.from({ length: 8 }, (_, i): [string, string] => [`fillType${i}`, "textColor"]),
        ];

        for (const [fill, text] of pairs) {
            expect(contrast(v[fill], v[text]), `${text} on ${fill}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it.each<Mode>(["light", "dark"])("keeps edges and node borders visible on the canvas (%s)", (mode) => {
        const v = themeVars(mode);
        for (const key of ["lineColor", "primaryBorderColor"]) {
            expect(contrast(v[key], v.background), key).toBeGreaterThanOrEqual(3);
        }
    });
});
