import type { AstroIntegration } from "astro";
import mermaid, { type AstroMermaidOptions } from "astro-mermaid";
import { darken, isDark, lighten, mix, transparentize } from "khroma";

export interface NorthwesternMermaidOptions extends AstroMermaidOptions {
    toolbar?: boolean;
}

export type NorthwesternMermaidMode = "light" | "dark";

type ThemeVariables = Record<string, unknown>;

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

        git0: chartPalette[0],
        git1: chartPalette[1],
        git2: chartPalette[2],
        git3: chartPalette[3],
        git4: chartPalette[4],
        git5: chartPalette[5],
        git6: chartPalette[6],
        git7: chartPalette[7],
        gitBranchLabel0: onColor(chartPalette[0]),
        gitBranchLabel1: onColor(chartPalette[1]),
        gitBranchLabel2: onColor(chartPalette[2]),
        gitBranchLabel3: onColor(chartPalette[3]),
        gitBranchLabel4: onColor(chartPalette[4]),
        gitBranchLabel5: onColor(chartPalette[5]),
        gitBranchLabel6: onColor(chartPalette[6]),
        gitBranchLabel7: onColor(chartPalette[7]),
        gitInv0: palette.white,

        pie1: chartPalette[0],
        pie2: chartPalette[1],
        pie3: chartPalette[2],
        pie4: chartPalette[3],
        pie5: chartPalette[4],
        pie6: chartPalette[5],
        pie7: chartPalette[6],
        pie8: chartPalette[7],
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
        pieOuterStrokeColor: dark ? palette.border : palette.border,
        pieOpacity: "0.85",

        cScale0: dark ? mix(primary, palette.canvas, 40) : primary,
        cScale1: dark ? mix(palette.blue, palette.canvas, 40) : palette.blue,
        cScale2: dark ? mix(palette.green, palette.canvas, 40) : palette.green,
        cScale3: dark ? mix(palette.orange, palette.canvas, 35) : palette.orange,
        cScale4: dark ? mix(palette.teal, palette.canvas, 35) : darken(palette.teal, 15),
        cScale5: dark ? mix(palette.yellow, palette.canvas, 30) : darken(palette.yellow, 20),
        cScale6: dark ? mix(palette.red, palette.canvas, 35) : palette.red,
        cScale7: dark ? mix(primary, palette.canvas, 30) : lighten(primary, 10),

        cScaleLabel0: palette.white,
        cScaleLabel1: palette.white,
        cScaleLabel2: palette.white,
        cScaleLabel3: palette.white,
        cScaleLabel4: dark ? palette.white : palette.black,
        cScaleLabel5: palette.black,
        cScaleLabel6: palette.white,
        cScaleLabel7: palette.white,

        quadrant1Fill: dark ? mix(primary, palette.canvas, 35) : mix(primary, palette.white, 25),
        quadrant2Fill: dark ? mix(primary, palette.canvas, 28) : mix(primary, palette.white, 18),
        quadrant3Fill: dark ? mix(primary, palette.canvas, 22) : mix(primary, palette.white, 12),
        quadrant4Fill: dark ? mix(primary, palette.canvas, 15) : mix(primary, palette.white, 8),
        quadrant1TextFill: onColor(dark ? mix(primary, palette.canvas, 35) : mix(primary, palette.white, 25)),
        quadrant2TextFill: onColor(dark ? mix(primary, palette.canvas, 28) : mix(primary, palette.white, 18)),
        quadrant3TextFill: onColor(dark ? mix(primary, palette.canvas, 22) : mix(primary, palette.white, 12)),
        quadrant4TextFill: onColor(dark ? mix(primary, palette.canvas, 15) : mix(primary, palette.white, 8)),
        quadrantPointFill: primary,
        quadrantPointTextFill: dark ? palette.white : palette.black,
        quadrantXAxisTextFill: palette.text,
        quadrantYAxisTextFill: palette.text,
        quadrantTitleFill: palette.text,
        quadrantInternalBorderStrokeFill: dark ? palette.border : lighten(palette.border, 10),
        quadrantExternalBorderStrokeFill: palette.border,

        xyChart: {
            plotColorPalette: chartPalette.join(","),
            titleColor: dark ? "#342f2e" : palette.text,
            xAxisLabelColor: dark ? "#342f2e" : palette.text,
            yAxisLabelColor: dark ? "#342f2e" : palette.text,
            xAxisTitleColor: dark ? "#342f2e" : palette.text,
            yAxisTitleColor: dark ? "#342f2e" : palette.text,
            xAxisLineColor: "#ccc",
            yAxisLineColor: "#ccc",
        },
    };
}

export function createNorthwesternMermaidConfig(mode: NorthwesternMermaidMode): AstroMermaidOptions {
    const palette = createPalette(mode);
    return {
        theme: "base",
        autoTheme: false,
        mermaidConfig: {
            themeVariables: createThemeVariables(mode),
            xyChart: {
                plotColorPalette: chartPalette.join(","),
                titleColor: mode === "dark" ? "#342f2e" : palette.text,
                xAxisLabelColor: mode === "dark" ? "#342f2e" : palette.text,
                yAxisLabelColor: mode === "dark" ? "#342f2e" : palette.text,
                xAxisTitleColor: mode === "dark" ? "#342f2e" : palette.text,
                yAxisTitleColor: mode === "dark" ? "#342f2e" : palette.text,
                xAxisLineColor: "#ccc",
                yAxisLineColor: "#ccc",
            },
        },
    };
}

/**
 * Northwestern-branded Mermaid configuration.
 *
 * The theme is derived from a small brand palette per mode instead of a large
 * hand-authored variable table. Mermaid renders with a dedicated light or dark
 * config, while CSS remains limited to structural SVG tweaks.
 */
export const defaultMermaidConfig: AstroMermaidOptions = createNorthwesternMermaidConfig("light");
export const darkMermaidConfig: AstroMermaidOptions = createNorthwesternMermaidConfig("dark");

export function northwesternMermaid(options: NorthwesternMermaidOptions = {}): AstroIntegration {
    const { toolbar = true, ...overrides } = options;
    const lightConfig = createNorthwesternMermaidConfig("light");
    const darkConfig = createNorthwesternMermaidConfig("dark");

    const mermaidIntegration = mermaid({
        ...lightConfig,
        ...overrides,
        enableLog: false,
        mermaidConfig: {
            ...(lightConfig.mermaidConfig ?? {}),
            ...(overrides.mermaidConfig ?? {}),
            themeVariables: {
                ...((lightConfig.mermaidConfig as Record<string, unknown>)?.themeVariables ?? {}),
                ...((overrides.mermaidConfig as Record<string, unknown>)?.themeVariables ?? {}),
            },
        },
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
                            light: lightConfig.mermaidConfig,
                            dark: darkConfig.mermaidConfig,
                        },
                    )}; import "@nu-appdev/northwestern-starlight-theme/src/scripts/mermaid-toolbar.ts";`,
                );
            },
        },
    };
}
