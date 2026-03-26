import type { AstroIntegration } from "astro";
import mermaid, { type AstroMermaidOptions } from "astro-mermaid";
import { darken, isDark, lighten, mix, transparentize } from "khroma";

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
 * Resolved brand palette for a single theme mode.
 *
 * All values are hex strings. Derived from Northwestern's brand primaries
 * with light/dark adjustments via `khroma`.
 */
type BrandPalette = {
    purple: string;
    blue: string;
    green: string;
    yellow: string;
    red: string;
    teal: string;
    orange: string;
    white: string;
    black: string;
    canvas: string;
    text: string;
    textMuted: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    edgeLabel: string;
};

const chartPalette = ["#4e2a84", "#836eaa", "#5091cd", "#008656", "#ffc520", "#ef553f", "#7fcecd", "#d85820"];

/** Generate `{ prefix0: fn(0), prefix1: fn(1), ... }` from an array. */
function indexedVars(prefix: string, values: string[], startAt = 0): ThemeVariables {
    const out: ThemeVariables = {};
    for (let i = 0; i < values.length; i++) {
        out[`${prefix}${i + startAt}`] = values[i];
    }
    return out;
}

function onColor(color: string, darkText = "#342f2e", lightText = "#fff") {
    return isDark(color) ? lightText : darkText;
}

function createPalette(mode: NorthwesternMermaidMode): BrandPalette {
    if (mode === "dark") {
        const canvas = "#1c1c1f";
        const purple = lighten("#4e2a84", 8);
        const blue = lighten("#1168bd", 6);

        return {
            purple,
            blue,
            green: "#008656",
            yellow: "#ffc520",
            red: "#ef553f",
            teal: "#7fcecd",
            orange: "#d85820",
            white: "#fff",
            black: "#342f2e",
            canvas,
            text: "#f0f0f0",
            textMuted: mix("#f0f0f0", canvas, 60),
            surface: mix("#4e2a84", canvas, 18),
            surfaceAlt: mix("#fff", canvas, 8),
            border: mix("#b6acd1", canvas, 18),
            edgeLabel: "#fff",
        };
    }

    return {
        purple: "#4e2a84",
        blue: "#1168bd",
        green: "#008656",
        yellow: "#ffc520",
        red: "#ef553f",
        teal: "#7fcecd",
        orange: "#d85820",
        white: "#fff",
        black: "#342f2e",
        canvas: "#fff",
        text: "#342f2e",
        textMuted: mix("#342f2e", "#fff", 45),
        surface: "#f3f0f7",
        surfaceAlt: "#e4e0ee",
        border: "#b6acd1",
        edgeLabel: "#fff",
    };
}

function createThemeVariables(mode: NorthwesternMermaidMode): ThemeVariables {
    const palette = createPalette(mode);
    const dark = mode === "dark";
    const primary = palette.purple;
    const primaryBorder = dark ? lighten(primary, 24) : darken(primary, 10);
    const secondary = dark ? palette.surface : palette.surfaceAlt;
    const tertiary = dark ? mix(palette.white, palette.canvas, 6) : palette.surface;
    const noteBackground = dark ? mix(primary, palette.canvas, 16) : palette.surface;
    const actorLine = dark ? primary : primary;
    const activation = dark ? mix(primary, palette.canvas, 28) : palette.surfaceAlt;
    const cluster = dark ? mix(primary, palette.canvas, 10) : lighten(palette.surface, 2);
    const _externalSystem = dark ? mix(palette.white, palette.canvas, 38) : "#999";
    const stateBackground = dark ? mix(palette.white, palette.canvas, 8) : tertiary;
    const compositeBackground = dark ? mix(palette.white, palette.canvas, 5) : palette.white;
    const compositeAltBackground = dark ? mix(palette.purple, palette.canvas, 22) : palette.surfaceAlt;
    const stateTitleBackground = dark ? mix(primary, palette.canvas, 14) : tertiary;
    const stateLabelColor = dark ? palette.white : palette.black;
    const rowOdd = dark ? mix(primary, palette.canvas, 26) : palette.surface;
    const rowEven = dark ? mix(palette.white, palette.canvas, 8) : palette.white;

    return {
        primaryColor: primary,
        primaryTextColor: onColor(primary),
        primaryBorderColor: primaryBorder,

        secondaryColor: secondary,
        secondaryTextColor: onColor(secondary),
        secondaryBorderColor: palette.border,

        tertiaryColor: tertiary,
        tertiaryTextColor: onColor(tertiary),
        tertiaryBorderColor: dark ? mix(palette.border, palette.canvas, 24) : lighten(palette.border, 8),

        background: palette.canvas,
        mainBkg: primary,
        secondBkg: secondary,
        tertiaryBkg: tertiary,

        textColor: palette.text,
        taskTextColor: palette.text,
        taskTextLightColor: palette.white,
        nodeTextColor: onColor(primary),
        textColorStrong: palette.text,
        mainContrastColor: palette.text,
        darkTextColor: palette.black,
        lineColor: dark ? lighten(primary, 28) : primary,
        arrowheadColor: dark ? lighten(primary, 28) : primary,
        defaultLinkColor: dark ? lighten(primary, 28) : primary,
        fontFamily: '"Akkurat Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",

        nodeBkg: primary,
        nodeBorder: primaryBorder,
        border1: palette.border,
        border2: primaryBorder,
        clusterBkg: cluster,
        clusterBorder: palette.border,
        edgeLabelBackground: palette.edgeLabel,
        labelBackground: palette.edgeLabel,

        titleColor: palette.text,
        labelColor: palette.text,
        labelTextColor: palette.text,
        loopTextColor: palette.text,
        transitionColor: dark ? lighten(primary, 28) : primary,
        transitionLabelColor: palette.black,
        stateLabelColor,
        stateBkg: stateBackground,
        labelBackgroundColor: palette.edgeLabel,
        compositeBackground,
        compositeTitleBackground: stateTitleBackground,
        compositeBorder: palette.border,
        innerEndBackground: compositeBackground,
        specialStateColor: primary,

        noteBkgColor: noteBackground,
        noteBorderColor: palette.border,
        noteTextColor: palette.text,

        actorBkg: primary,
        actorBorder: primaryBorder,
        actorTextColor: onColor(primary),
        actorLineColor: actorLine,
        signalColor: palette.text,
        signalTextColor: palette.text,
        labelBoxBkgColor: noteBackground,
        labelBoxBorderColor: palette.border,
        activationBkgColor: activation,
        activationBorderColor: actorLine,
        sequenceNumberColor: dark ? palette.black : palette.white,

        taskBorderColor: primaryBorder,
        taskBkgColor: primary,
        taskTextOutsideColor: palette.text,
        taskTextClickableColor: dark ? lighten(primary, 32) : primary,
        activeTaskBorderColor: dark ? lighten(primary, 20) : darken(primary, 10),
        activeTaskBkgColor: dark ? lighten(primary, 12) : lighten(primary, 8),
        gridColor: dark ? mix(palette.white, palette.canvas, 15) : "#ddd",
        doneTaskBkgColor: dark ? mix(palette.green, palette.canvas, 30) : lighten(palette.green, 30),
        doneTaskBorderColor: palette.green,
        critBorderColor: palette.red,
        critBkgColor: dark ? mix(palette.red, palette.canvas, 30) : lighten(palette.red, 30),
        taskTextDarkColor: palette.text,
        todayLineColor: palette.red,

        errorBkgColor: dark ? mix(palette.red, palette.canvas, 30) : lighten(palette.red, 36),
        errorTextColor: dark ? lighten(palette.red, 20) : palette.red,

        requirementBackground: dark ? mix(primary, palette.canvas, 20) : palette.surface,
        requirementBorderColor: palette.border,
        requirementBorderSize: "1",
        requirementTextColor: palette.text,
        relationColor: dark ? lighten(primary, 28) : primary,
        relationLabelBackground: palette.edgeLabel,
        relationLabelColor: palette.text,

        altBackground: secondary,
        classText: palette.white,
        fillType0: primary,
        fillType1: secondary,
        fillType2: mix("#8b1e5a", palette.canvas, dark ? 20 : 0),
        fillType3: mix("#f1dfe8", palette.canvas, dark ? 65 : 0),
        fillType4: mix("#0d5f90", palette.canvas, dark ? 10 : 0),
        fillType5: mix("#d9eef6", palette.canvas, dark ? 65 : 0),
        fillType6: mix("#8d4a00", palette.canvas, dark ? 10 : 0),
        fillType7: mix("#f8e9d7", palette.canvas, dark ? 68 : 0),

        rowOdd,
        rowEven,
        attributeBackgroundColorOdd: dark ? transparentize(primary, 0.76) : palette.surface,
        attributeBackgroundColorEven: dark ? "#1f1f23" : palette.white,
        sectionBkgColor: rowOdd,
        altSectionBkgColor: rowEven,
        sectionBkgColor2: compositeAltBackground,

        // Git graph — one color per branch from the chart palette
        ...indexedVars("git", chartPalette),
        ...indexedVars(
            "gitBranchLabel",
            chartPalette.map((c) => onColor(c)),
        ),
        gitInv0: palette.white,

        // Pie chart — 8 base slices + 4 extended with tint shift
        ...indexedVars("pie", chartPalette, 1),
        pie9: dark ? lighten(chartPalette[0], 16) : darken(chartPalette[0], 10),
        pie10: dark ? lighten(chartPalette[2], 16) : darken(chartPalette[2], 10),
        pie11: dark ? lighten(chartPalette[3], 16) : darken(chartPalette[3], 10),
        pie12: dark ? lighten(chartPalette[4], 10) : darken(chartPalette[4], 10),
        pieStrokeColor: dark ? palette.canvas : palette.white,
        pieSectionTextColor: palette.white,
        pieSectionTextSize: "14px",
        pieTitleTextColor: palette.text,
        pieTitleTextSize: "16px",
        pieLegendTextColor: palette.text,
        pieLegendTextSize: "14px",
        pieStrokeWidth: "2px",
        pieOuterStrokeWidth: "1px",
        pieOuterStrokeColor: palette.border,
        pieOpacity: "0.85",

        // C4/journey scale — each color mixed toward canvas in dark mode
        ...(() => {
            const colors = [
                primary,
                palette.blue,
                palette.green,
                palette.orange,
                palette.teal,
                palette.yellow,
                palette.red,
                primary,
            ];
            const darkMix = [40, 40, 40, 35, 35, 30, 35, 30];
            const lightFallback = [
                primary,
                palette.blue,
                palette.green,
                palette.orange,
                darken(palette.teal, 15),
                darken(palette.yellow, 20),
                palette.red,
                lighten(primary, 10),
            ];
            return indexedVars(
                "cScale",
                colors.map((c, i) => (dark ? mix(c, palette.canvas, darkMix[i]) : lightFallback[i])),
            );
        })(),
        ...indexedVars("cScaleLabel", [
            palette.white,
            palette.white,
            palette.white,
            palette.white,
            dark ? palette.white : palette.black,
            palette.black,
            palette.white,
            palette.white,
        ]),

        // Quadrant chart — progressive primary tints
        ...(() => {
            const darkRatios = [35, 28, 22, 15];
            const lightRatios = [25, 18, 12, 8];
            const fills = darkRatios.map((dr, i) =>
                dark ? mix(primary, palette.canvas, dr) : mix(primary, palette.white, lightRatios[i]),
            );
            return {
                ...indexedVars("quadrantFill", fills, 1),
                ...indexedVars(
                    "quadrantTextFill",
                    fills.map((f) => onColor(f)),
                    1,
                ),
            };
        })(),
        quadrantPointFill: primary,
        quadrantPointTextFill: dark ? palette.white : palette.black,
        quadrantXAxisTextFill: palette.text,
        quadrantYAxisTextFill: palette.text,
        quadrantTitleFill: palette.text,
        quadrantInternalBorderStrokeFill: dark ? palette.border : lighten(palette.border, 10),
        quadrantExternalBorderStrokeFill: palette.border,

        xyChart: {
            plotColorPalette: chartPalette.join(","),
            titleColor: palette.text,
            xAxisLabelColor: palette.text,
            yAxisLabelColor: palette.text,
            xAxisTitleColor: palette.text,
            yAxisTitleColor: palette.text,
            xAxisLineColor: dark ? palette.border : "#ccc",
            yAxisLineColor: dark ? palette.border : "#ccc",
        },
    };
}

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
    const palette = createPalette(mode);
    return {
        theme: "base",
        autoTheme: false,
        mermaidConfig: {
            themeVariables: createThemeVariables(mode),
            xyChart: {
                plotColorPalette: chartPalette.join(","),
                titleColor: palette.text,
                xAxisLabelColor: palette.text,
                yAxisLabelColor: palette.text,
                xAxisTitleColor: palette.text,
                yAxisTitleColor: palette.text,
                xAxisLineColor: mode === "dark" ? palette.border : "#ccc",
                yAxisLineColor: mode === "dark" ? palette.border : "#ccc",
            },
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
 * **Must be added before `starlight()` in the `integrations` array.** The
 * `astro-mermaid` remark plugin needs to register before Starlight's rehype
 * processing, and Astro processes integrations in order. Placing it after
 * `starlight()` causes Mermaid code blocks to be treated as plain code.
 *
 * @param options - Merged with Northwestern defaults. Set `toolbar: false` to
 *   disable the hover toolbar.
 * @returns An Astro integration to add to `integrations` in your Astro config.
 *
 * @example
 * ```ts
 * import { northwesternMermaid } from "@nu-appdev/northwestern-starlight-theme/mermaid";
 * import northwesternTheme from "@nu-appdev/northwestern-starlight-theme";
 *
 * export default defineConfig({
 *     integrations: [
 *         northwesternMermaid(), // Must come before starlight()
 *         starlight({
 *             plugins: [northwesternTheme()],
 *             title: "My Docs",
 *         }),
 *     ],
 * });
 * ```
 */
export function northwesternMermaid(options: NorthwesternMermaidOptions = {}): AstroIntegration {
    const { toolbar = true, ...overrides } = options;
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

    const mermaidIntegration = mermaid({
        ...lightConfig,
        ...overrides,
        enableLog: false,
        mermaidConfig: mergedLightMermaidConfig,
    });

    return {
        name: "northwestern-mermaid",
        hooks: {
            "astro:config:setup"(params) {
                mermaidIntegration.hooks["astro:config:setup"]?.(params);

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
