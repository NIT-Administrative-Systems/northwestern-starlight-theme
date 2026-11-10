import type { AstroIntegration } from "astro";
import type { AstroMermaidOptions } from "astro-mermaid";
import { darken, lighten, luminance, mix, toHex } from "khroma";
import { northwesternMermaidOptionsSchema, validateSchema } from "./src/config-schema";

/**
 * Configuration options for the Northwestern Mermaid integration.
 *
 * Extends `astro-mermaid` options with a `toolbar` toggle that controls
 * the hover toolbar (fullscreen, download, copy) on rendered diagrams.
 *
 * @see {@link northwesternMermaid} for the integration factory
 */
export interface NorthwesternMermaidOptions extends AstroMermaidOptions {
    /**
     * Show the hover toolbar (fullscreen, download SVG, copy source) on diagrams.
     *
     * @default true
     */
    toolbar?: boolean;
}

/**
 * Theme mode for Mermaid color palette generation.
 *
 * Maps to the `data-theme` attribute on `<html>`: `"light"` for the default
 * palette, `"dark"` for the inverted palette with lighter primary colors
 * and darker canvas backgrounds.
 */
export type NorthwesternMermaidMode = "light" | "dark";

/** Flat key-value map passed to Mermaid's `themeVariables`. */
type ThemeVariables = Record<string, unknown>;

/**
 * Northwestern palette values from `@nu-appdev/northwestern-tokens`.
 *
 * Mermaid derives colors with `khroma`, which needs literal hex values rather
 * than CSS custom properties, so the tokens the diagrams use are mirrored here.
 */
const nu = {
    purple10: "#e4e0ee",
    purple20: "#ccc4df",
    purple30: "#b6acd1",
    purple40: "#a495c3",
    purple50: "#9380b6",
    purple60: "#836eaa",
    purple80: "#684c96",
    purple90: "#5b3b8c",
    purple100: "#4e2a84",
    purple120: "#401f68",
    purple130: "#38175a",
    purpleSurface: "#f9f6ff",
    purpleSurfaceSubtle: "#f3f0f7",
    black80: "#342f2e",
    black50: "#716c6b",
    black20: "#bbb8b8",
    black10: "#d8d6d6",
    green: "#58b947",
    teal: "#7fcecd",
    blue: "#5091cd",
    gold: "#ffc520",
    orange: "#ef553f",
    darkGreen: "#008656",
    darkTeal: "#007fa4",
    darkBlue: "#0d2d6c",
    darkOrange: "#d85820",
} as const;

/** Dark text used on light fills, matching `--nu-color-text` in light mode. */
const darkText = nu.black80;
/** Light text used on dark fills. */
const lightText = "#fff";

/** WCAG 2 contrast ratio between two colors. */
function contrastRatio(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Pick whichever of dark or light text has more contrast on `color`. */
function onColor(color: string): string {
    return contrastRatio(color, darkText) >= contrastRatio(color, lightText) ? darkText : lightText;
}

/**
 * Return `color`, darkened in small steps until its best text color reaches
 * the WCAG AA ratio for normal text (4.5:1). Mid-tone brand colors such as
 * orange fail with both dark and light text, so they shift slightly darker.
 */
function accessibleFill(color: string): string {
    let fill = color;
    for (let i = 0; i < 20 && contrastRatio(fill, onColor(fill)) < 4.5; i++) {
        fill = darken(fill, 2);
    }
    return fill;
}

/**
 * Convert the `rgb()` and `hsl()` strings khroma returns into hex, recursing
 * into nested variable groups such as `xyChart`, so the emitted SVG and the
 * PNG export see one predictable format.
 */
function normalizeColors<T>(value: T): T {
    if (typeof value === "string") {
        return (/^(rgb|hsl)a?\(/.test(value) ? toHex(value) : value) as T;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeColors(v)])) as T;
    }
    return value;
}

/** Generate `{ prefix0: values[0], prefix1: values[1], ... }`. */
function indexedVars(prefix: string, values: string[], startAt = 0): ThemeVariables {
    const out: ThemeVariables = {};
    for (let i = 0; i < values.length; i++) {
        out[`${prefix}${i + startAt}`] = values[i];
    }
    return out;
}

/**
 * Resolved palette for a single theme mode.
 *
 * `canvas` matches the docs page behind the diagram, `text` matches
 * `--nu-color-text`, and `line` is the stroke for edges, arrows and lifelines.
 */
type BrandPalette = {
    canvas: string;
    text: string;
    textMuted: string;
    node: string;
    nodeBorder: string;
    line: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    grid: string;
    /** Categorical colors for timelines, mindmaps, kanban, treemaps and radar charts. */
    categorical: string[];
    /** Chart series colors for pie, git and xy charts. */
    chart: string[];
};

/** Chart series in brand order. Pie slices and xy bars carry no text, so no contrast shift. */
const chartPalette = [nu.purple100, nu.purple60, nu.blue, nu.darkGreen, nu.gold, nu.orange, nu.teal, nu.darkOrange];

function createPalette(mode: NorthwesternMermaidMode): BrandPalette {
    const categorical = [
        nu.purple100,
        nu.darkTeal,
        nu.darkGreen,
        nu.gold,
        nu.purple60,
        nu.darkOrange,
        nu.darkBlue,
        nu.black50,
        nu.purple120,
        nu.teal,
        nu.blue,
        nu.green,
    ];

    if (mode === "dark") {
        const canvas = "#1c1c1f";
        return {
            canvas,
            text: "#f0f0f0",
            textMuted: "#a1a1aa",
            node: nu.purple80,
            nodeBorder: nu.purple40,
            line: nu.purple30,
            surface: mix(nu.purple100, canvas, 22),
            surfaceAlt: mix("#fff", canvas, 7),
            border: mix(nu.purple40, canvas, 55),
            grid: mix("#fff", canvas, 14),
            categorical: [nu.purple80, ...categorical.slice(1)].map(accessibleFill),
            chart: [nu.purple60, nu.purple40, ...chartPalette.slice(2)],
        };
    }

    return {
        canvas: "#fff",
        text: darkText,
        textMuted: nu.black50,
        node: nu.purple100,
        nodeBorder: nu.purple130,
        line: nu.purple100,
        surface: nu.purpleSurfaceSubtle,
        surfaceAlt: nu.purple10,
        border: nu.purple40,
        grid: nu.black10,
        categorical: categorical.map(accessibleFill),
        chart: chartPalette,
    };
}

function createThemeVariables(mode: NorthwesternMermaidMode): ThemeVariables {
    const p = createPalette(mode);
    const dark = mode === "dark";
    /** Blend `color` into the canvas: a tinted fill that keeps `p.text` readable. */
    const tint = (color: string, amount: number) => mix(color, p.canvas, amount);

    const secondary = dark ? p.surface : p.surfaceAlt;
    const tertiary = dark ? p.surfaceAlt : p.surface;
    const cluster = dark ? tint(nu.purple100, 12) : nu.purpleSurface;
    const note = dark ? tint(nu.gold, 12) : "#fff8e1";
    const noteBorder = dark ? tint(nu.gold, 55) : "#e0b84c";
    const activation = dark ? tint(nu.purple100, 40) : nu.purple10;
    const stateFill = dark ? p.surfaceAlt : nu.purpleSurfaceSubtle;
    const rowOdd = dark ? tint(nu.purple100, 26) : nu.purpleSurfaceSubtle;
    const rowEven = dark ? p.surfaceAlt : "#fff";

    // Journey sections and tasks put body text directly on these fills, so they
    // stay tints in both modes rather than solid brand colors.
    const journeyHues = [nu.purple100, nu.gold, nu.darkTeal, nu.darkGreen, nu.blue, nu.orange, nu.purple60, nu.black50];
    const journeyFills = journeyHues.map((c) => (dark ? tint(c, 30) : mix(c, "#fff", 18)));

    // Gantt prints `taskTextDarkColor` on active and done bars and on
    // labels that overflow onto the canvas, so those fills sit close to the canvas.
    const ganttActive = dark ? tint(nu.purple100, 45) : nu.purple20;
    const ganttDone = dark ? mix("#fff", p.canvas, 12) : nu.black10;
    // Critical bars that are neither active nor done print `taskTextColor`, so
    // they stay solid enough for light text.
    const ganttCrit = accessibleFill(nu.orange);

    const quadrantFills = (dark ? [38, 30, 22, 15] : [26, 18, 12, 7]).map((r) =>
        tint(dark ? nu.purple60 : nu.purple100, r),
    );

    return {
        darkMode: dark,
        background: p.canvas,
        fontFamily: '"Akkurat Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",

        primaryColor: p.node,
        primaryTextColor: onColor(p.node),
        primaryBorderColor: p.nodeBorder,
        secondaryColor: secondary,
        secondaryTextColor: onColor(secondary),
        secondaryBorderColor: p.border,
        tertiaryColor: tertiary,
        tertiaryTextColor: onColor(tertiary),
        tertiaryBorderColor: p.border,

        mainBkg: p.node,
        secondBkg: secondary,
        tertiaryBkg: tertiary,
        nodeBkg: p.node,
        nodeBorder: p.nodeBorder,
        nodeTextColor: onColor(p.node),
        border1: p.border,
        border2: p.nodeBorder,

        textColor: p.text,
        textColorStrong: p.text,
        mainContrastColor: p.text,
        darkTextColor: darkText,
        titleColor: p.text,
        labelColor: p.text,
        labelTextColor: p.text,
        loopTextColor: p.text,

        lineColor: p.line,
        arrowheadColor: p.line,
        defaultLinkColor: p.line,
        edgeLabelBackground: p.canvas,
        labelBackground: p.canvas,

        clusterBkg: cluster,
        clusterBorder: p.border,

        // State diagrams
        transitionColor: p.line,
        transitionLabelColor: p.text,
        stateLabelColor: p.text,
        stateBkg: stateFill,
        labelBackgroundColor: p.canvas,
        compositeBackground: p.canvas,
        compositeTitleBackground: stateFill,
        compositeBorder: p.border,
        altBackground: tertiary,
        innerEndBackground: p.canvas,
        specialStateColor: p.line,

        // Notes (sequence, class, state)
        noteBkgColor: note,
        noteBorderColor: noteBorder,
        noteTextColor: p.text,

        // Sequence diagrams
        actorBkg: p.node,
        actorBorder: p.nodeBorder,
        actorTextColor: onColor(p.node),
        actorLineColor: dark ? nu.purple50 : nu.purple60,
        signalColor: p.text,
        signalTextColor: p.text,
        labelBoxBkgColor: secondary,
        labelBoxBorderColor: p.border,
        activationBkgColor: activation,
        activationBorderColor: p.line,
        sequenceNumberColor: onColor(p.line),

        // Gantt
        taskBkgColor: p.node,
        taskBorderColor: p.nodeBorder,
        taskTextColor: onColor(p.node),
        taskTextLightColor: lightText,
        taskTextDarkColor: p.text,
        taskTextOutsideColor: p.text,
        taskTextClickableColor: dark ? nu.purple30 : nu.purple100,
        activeTaskBkgColor: ganttActive,
        activeTaskBorderColor: dark ? nu.purple40 : nu.purple100,
        doneTaskBkgColor: ganttDone,
        doneTaskBorderColor: dark ? nu.black50 : nu.black20,
        critBkgColor: ganttCrit,
        critBorderColor: dark ? nu.orange : darken(ganttCrit, 8),
        gridColor: p.grid,
        excludeBkgColor: dark ? mix("#fff", p.canvas, 4) : "#f6f4f9",
        todayLineColor: nu.orange,
        vertLineColor: p.line,
        sectionBkgColor: rowOdd,
        altSectionBkgColor: rowEven,
        sectionBkgColor2: dark ? tint(nu.purple100, 18) : nu.purple10,

        errorBkgColor: dark ? tint(nu.orange, 30) : mix(nu.orange, "#fff", 15),
        errorTextColor: p.text,

        // Requirement diagrams
        requirementBackground: p.node,
        requirementBorderColor: p.nodeBorder,
        requirementBorderSize: "1",
        requirementTextColor: onColor(p.node),
        relationColor: p.line,
        relationLabelBackground: p.canvas,
        relationLabelColor: p.text,

        // Class and ER diagrams
        classText: onColor(p.node),
        rowOdd,
        rowEven,
        attributeBackgroundColorOdd: rowOdd,
        attributeBackgroundColorEven: rowEven,

        // User journey
        ...indexedVars("fillType", journeyFills),
        ...indexedVars("actor", [p.node, nu.darkTeal, nu.darkGreen, nu.gold, nu.darkOrange, nu.blue]),
        faceColor: dark ? tint(nu.gold, 70) : "#fff3cc",

        // Timeline, mindmap, kanban, treemap, radar
        ...indexedVars("cScale", p.categorical),
        ...indexedVars("cScaleLabel", p.categorical.map(onColor)),
        ...indexedVars(
            "cScalePeer",
            p.categorical.map((c) => (dark ? lighten(c, 12) : darken(c, 10))),
        ),
        scaleLabelColor: p.text,

        // Git graph — one branch color per chart series
        ...indexedVars("git", p.chart),
        ...indexedVars("gitBranchLabel", p.chart.map(onColor)),
        ...indexedVars("gitInv", p.chart.map(onColor)),
        tagLabelColor: onColor(p.node),
        tagLabelBackground: p.node,
        tagLabelBorder: p.nodeBorder,
        commitLabelColor: p.text,
        commitLabelBackground: p.canvas,

        // Pie
        ...indexedVars("pie", p.chart, 1),
        pie9: dark ? lighten(nu.purple100, 16) : darken(nu.purple100, 10),
        pie10: dark ? lighten(nu.blue, 16) : darken(nu.blue, 10),
        pie11: dark ? lighten(nu.darkGreen, 16) : darken(nu.darkGreen, 10),
        pie12: dark ? lighten(nu.gold, 10) : darken(nu.gold, 10),
        pieStrokeColor: p.canvas,
        pieSectionTextColor: lightText,
        pieSectionTextSize: "14px",
        pieTitleTextColor: p.text,
        pieTitleTextSize: "16px",
        pieLegendTextColor: p.text,
        pieLegendTextSize: "14px",
        pieStrokeWidth: "2px",
        pieOuterStrokeWidth: "1px",
        pieOuterStrokeColor: p.border,
        pieOpacity: "0.9",

        // Quadrant chart — progressive purple tints
        // Mermaid names these quadrant1Fill … quadrant4Fill, so they cannot use indexedVars.
        ...Object.fromEntries(
            quadrantFills.flatMap((fill, i) => [
                [`quadrant${i + 1}Fill`, fill],
                [`quadrant${i + 1}TextFill`, onColor(fill)],
            ]),
        ),
        quadrantPointFill: dark ? nu.purple30 : nu.purple100,
        quadrantPointTextFill: p.text,
        quadrantXAxisTextFill: p.text,
        quadrantYAxisTextFill: p.text,
        quadrantTitleFill: p.text,
        quadrantInternalBorderStrokeFill: p.border,
        quadrantExternalBorderStrokeFill: p.border,

        // Architecture
        archEdgeColor: p.line,
        archEdgeArrowColor: p.line,
        archEdgeWidth: "2",
        archGroupBorderColor: p.border,
        archGroupBorderWidth: "1px",

        // Diagrams with their own nested variable groups
        xyChart: {
            backgroundColor: "transparent",
            plotColorPalette: p.chart.join(","),
            titleColor: p.text,
            dataLabelColor: p.text,
            legendTextColor: p.text,
            xAxisTitleColor: p.text,
            xAxisLabelColor: p.text,
            xAxisTickColor: p.textMuted,
            xAxisLineColor: p.border,
            yAxisTitleColor: p.text,
            yAxisLabelColor: p.text,
            yAxisTickColor: p.textMuted,
            yAxisLineColor: p.border,
        },
        radar: {
            axisColor: p.border,
            // Graticule rings are stacked filled circles, so a faint fill adds up.
            graticuleColor: dark ? "#fff" : nu.purple40,
            graticuleOpacity: dark ? 0.05 : 0.1,
            curveOpacity: 0.45,
        },
        packet: {
            blockFillColor: secondary,
            blockStrokeColor: p.border,
            labelColor: p.text,
            titleColor: p.text,
            startByteColor: p.textMuted,
            endByteColor: p.textMuted,
        },
    };
}

/**
 * C4 element colors. C4 reads these from its own config section rather than
 * `themeVariables`, and its labels are always white, so every fill is dark
 * enough for white text.
 */
const c4Colors = (() => {
    const kinds = {
        person: nu.purple120,
        system: nu.purple100,
        container: nu.purple80,
        component: accessibleFill(nu.purple60),
    };
    const external = { person: nu.black50, system: nu.black50, container: "#5f5a59", component: "#5f5a59" };
    const out: Record<string, string> = {};
    for (const [kind, color] of Object.entries(kinds)) {
        for (const variant of ["", "_db", "_queue"]) {
            if (kind === "person" && variant) continue;
            out[`${kind}${variant}_bg_color`] = color;
            out[`${kind}${variant}_border_color`] = darken(color, 6);
            const ext = external[kind as keyof typeof external];
            out[`external_${kind}${variant}_bg_color`] = ext;
            out[`external_${kind}${variant}_border_color`] = darken(ext, 6);
        }
    }
    return out;
})();

/**
 * Generate a complete `astro-mermaid` config with Northwestern-branded colors
 * for the given theme mode.
 *
 * Builds a Mermaid `themeVariables` object from the Northwestern brand palette,
 * deriving all node, edge, label, chart, and diagram-specific colors from a
 * small set of brand primaries via `khroma` color manipulation.
 *
 * @param mode - `"light"` or `"dark"`. Controls canvas, text, and primary color values.
 * @returns A complete `AstroMermaidOptions` object ready to pass to `astro-mermaid`.
 *
 * @example
 * ```ts
 * import { createNorthwesternMermaidConfig } from "@nu-appdev/northwestern-starlight-theme/mermaid";
 *
 * const darkConfig = createNorthwesternMermaidConfig("dark");
 * // darkConfig.mermaidConfig.themeVariables contains all colors
 * ```
 */
export function createNorthwesternMermaidConfig(mode: NorthwesternMermaidMode): AstroMermaidOptions {
    return {
        theme: "base",
        autoTheme: false,
        mermaidConfig: {
            // Repeated inside mermaidConfig so the toolbar's re-render passes it to
            // mermaid.initialize(), which resets every key it is not given. Mermaid 12
            // otherwise falls back to per-diagram defaults such as `redux-color`.
            theme: "base",
            // Mermaid 12 defaults most diagrams to the `neo` look and ELK layout.
            // Classic keeps the flat, square-cornered brand style, and dagre keeps
            // existing diagrams laid out as before. Both can be overridden.
            look: "classic",
            layout: "dagre",
            // Mermaid 12 widens every flowchart node to at least 120px and wraps
            // labels at 120px. In a docs column that scales whole diagrams, and
            // their text, down by about a third, so keep Mermaid 11 sizing.
            flowchart: { minNodeWidth: 0, wrappingWidth: 200 },
            themeVariables: normalizeColors(createThemeVariables(mode)),
            c4: normalizeColors(c4Colors),
        },
    };
}

/**
 * Pre-built light-mode Mermaid config with Northwestern brand colors.
 *
 * Used as the default when Mermaid is auto-detected. Override individual
 * `themeVariables` by passing a `mermaid` object to {@link northwesternTheme}
 * in `index.ts`, or use {@link createNorthwesternMermaidConfig} for full control.
 */
export const defaultMermaidConfig: AstroMermaidOptions = createNorthwesternMermaidConfig("light");

/**
 * Pre-built dark-mode Mermaid config with Northwestern brand colors.
 *
 * Applied at runtime when the user switches to dark mode. The toolbar script
 * re-renders diagrams with this config via `window.__NU_MERMAID_CONFIGS__.dark`.
 */
export const darkMermaidConfig: AstroMermaidOptions = createNorthwesternMermaidConfig("dark");

/**
 * Create an Astro integration that registers Northwestern-branded Mermaid diagrams.
 *
 * Wraps `astro-mermaid` with Northwestern color palettes for both light and dark
 * modes, and injects the toolbar script (fullscreen viewer, download, copy).
 *
 * **Note:** `defineNorthwesternConfig` handles Mermaid integration ordering.
 * This function is only needed for manual setups.
 *
 * **Must be added after `starlight()` in the `integrations` array.** This lets
 * `astro-mermaid` extend the active Markdown processor after Starlight and its
 * plugins have configured it.
 *
 * @param options - Merged with Northwestern defaults. Set `toolbar: false` to
 *   disable the hover toolbar.
 * @returns An Astro integration to add to `integrations` in your Astro config.
 *
 * @example Manual setup
 * ```ts
 * import { northwesternMermaid } from "@nu-appdev/northwestern-starlight-theme/mermaid";
 * import northwesternTheme from "@nu-appdev/northwestern-starlight-theme";
 *
 * export default defineConfig({
 *     integrations: [
 *         starlight({
 *             plugins: [northwesternTheme()],
 *             title: "My Docs",
 *         }),
 *         northwesternMermaid(), // Must come after starlight()
 *     ],
 * });
 * ```
 */
export function northwesternMermaid(options: NorthwesternMermaidOptions = {}): AstroIntegration {
    const { toolbar = true, ...overrides } = validateSchema(
        northwesternMermaidOptionsSchema,
        options,
        "Mermaid config",
    );
    const lightConfig = createNorthwesternMermaidConfig("light");
    const darkConfig = createNorthwesternMermaidConfig("dark");

    const userMermaidConfig = overrides.mermaidConfig ?? {};
    const userThemeVars = (userMermaidConfig as Record<string, unknown>)?.themeVariables ?? {};

    function mergeWithOverrides(base: Record<string, unknown>): Record<string, unknown> {
        return {
            ...base,
            ...userMermaidConfig,
            themeVariables: {
                ...(base.themeVariables ?? {}),
                ...userThemeVars,
            },
        };
    }

    const mergedLightMermaidConfig = mergeWithOverrides(lightConfig.mermaidConfig as Record<string, unknown>);
    const mergedDarkMermaidConfig = mergeWithOverrides(darkConfig.mermaidConfig as Record<string, unknown>);
    const mermaidModulePromise = import("astro-mermaid");

    return {
        name: "northwestern-mermaid",
        hooks: {
            async "astro:config:setup"(params) {
                const { default: mermaid } = await mermaidModulePromise;

                const mermaidIntegration = mermaid({
                    ...lightConfig,
                    ...overrides,
                    enableLog: false,
                    mermaidConfig: mergedLightMermaidConfig,
                });

                await mermaidIntegration.hooks["astro:config:setup"]?.(params);

                params.injectScript(
                    "page",
                    `window.__NU_MERMAID_TOOLBAR__ = ${toolbar ? "true" : "false"}; window.__NU_MERMAID_CONFIGS__ = ${JSON.stringify(
                        {
                            light: mergedLightMermaidConfig,
                            dark: mergedDarkMermaidConfig,
                        },
                    )}; import "@nu-appdev/northwestern-starlight-theme/src/scripts/mermaid/toolbar.ts";`,
                );
            },
        },
    };
}
