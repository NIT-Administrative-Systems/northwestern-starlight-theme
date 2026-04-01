import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import starlight from "@astrojs/starlight";
import type { StarlightPlugin, StarlightUserConfig } from "@astrojs/starlight/types";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import type { AstroIntegration, AstroUserConfig } from "astro";
import type { NorthwesternThemeConfig } from "./index.ts";
import northwesternTheme from "./index.ts";
import { type NorthwesternMermaidOptions, northwesternMermaid } from "./mermaid.ts";

/**
 * Vite plugin that enables `pluginLineNumbers` for both markdown code blocks
 * and the `<Code>` component without requiring a manual `ec.config.mjs` file.
 *
 * Expressive Code serializes inline config via JSON.stringify for the `<Code>`
 * component's virtual module. Plugin instances aren't serializable, causing a
 * build error when any page uses `<Code>`.
 *
 * This plugin:
 * 1. Strips non-serializable `plugins` from the virtual config module
 *    (so the `<Code>` component's serialization check passes)
 * 2. Provides a virtual `ec.config.mjs` that re-exports the plugins
 *    (so the `<Code>` component picks them up at render time via merge)
 *
 * If the user has a real `ec.config.mjs` on disk, this plugin does nothing.
 */
function northwesternEcVitePlugin() {
    const _require = createRequire(import.meta.url);
    const resolvedPluginPath = _require.resolve("@expressive-code/plugin-line-numbers").replaceAll("\\", "/");
    let hasRealEcConfig = false;

    return {
        name: "northwestern-ec-compat",
        configResolved(config: { root: string }) {
            hasRealEcConfig = existsSync(join(config.root, "ec.config.mjs"));
        },
        resolveId(id: string) {
            if (!hasRealEcConfig && id === "./ec.config.mjs") {
                return "\0northwestern-virtual-ec-config";
            }
        },
        load(id: string) {
            if (id === "\0northwestern-virtual-ec-config") {
                return [
                    `import { pluginLineNumbers } from "${resolvedPluginPath}";`,
                    "export default { plugins: [pluginLineNumbers()] };",
                ].join("\n");
            }
        },
        transform(code: string, id: string) {
            if (!hasRealEcConfig && id === "\0virtual:astro-expressive-code/config") {
                return code.replace(/export const ecIntegrationOptions = ({.*})/, (match: string, json: string) => {
                    try {
                        const parsed = JSON.parse(json);
                        delete parsed.plugins;
                        return `export const ecIntegrationOptions = ${JSON.stringify(parsed)}`;
                    } catch {
                        return match;
                    }
                });
            }
        },
    };
}
/**
 * Configuration options for {@link defineNorthwesternConfig}.
 *
 * Extends Astro's config (minus `integrations`) with Northwestern-specific
 * keys for Starlight, theming, and Mermaid. Integration ordering is handled
 * automatically. Use the `integrations` escape hatch only when you need
 * to inject integrations before or after the managed ones.
 */
export interface NorthwesternConfigOptions extends Omit<AstroUserConfig, "integrations"> {
    /** Full Starlight configuration. Supports all Starlight options with autocompletion. */
    starlight: StarlightUserConfig;

    /**
     * Northwestern theme plugin options (hero layout, OG images, etc.).
     *
     * @see {@link NorthwesternThemeConfig}
     */
    theme?: NorthwesternThemeConfig;

    /**
     * Mermaid diagram support.
     *
     * - `true` (default) — adds `northwesternMermaid()` before `starlight()` with
     *   default options (branded colors, toolbar, dark mode). Requires `astro-mermaid`
     *   and `mermaid` to be installed.
     * - `false` — disable Mermaid entirely
     * - `object` — adds `northwesternMermaid(options)` before `starlight()` with
     *   custom options (toolbar, theme overrides, etc.)
     */
    mermaid?: boolean | NorthwesternMermaidOptions;

    /**
     * Additional Starlight plugins to register alongside the Northwestern theme.
     *
     * The theme plugin is always first; these are appended after it.
     */
    plugins?: StarlightPlugin[];

    /**
     * Escape hatch for advanced integration ordering.
     *
     * - `before` — added before Mermaid and Starlight
     * - `after` — added after Starlight
     */
    integrations?: {
        before?: AstroIntegration[];
        after?: AstroIntegration[];
    };
}

/**
 * Create a complete Astro config with Northwestern Starlight theme defaults.
 *
 * Handles integration ordering (mermaid → starlight), plugin registration,
 * and Expressive Code (GitHub themes, line-numbers plugin). The return
 * value is a standard `AstroUserConfig` ready to
 * `export default` from `astro.config.ts`.
 *
 * @example
 * ```ts
 * import { defineNorthwesternConfig } from "@nu-appdev/northwestern-starlight-theme/config";
 *
 * export default defineNorthwesternConfig({
 *     site: "https://docs.example.northwestern.edu",
 *     starlight: {
 *         title: "My Docs",
 *         sidebar: [{ label: "Guide", autogenerate: { directory: "guide" } }],
 *     },
 * });
 * ```
 */
export function defineNorthwesternConfig(options: NorthwesternConfigOptions): AstroUserConfig {
    const {
        starlight: starlightConfig,
        theme,
        mermaid = true,
        plugins = [],
        integrations: extraIntegrations,
        ...astroConfig
    } = options;

    // Warn if user manually added northwesternTheme in plugins
    for (const plugin of plugins) {
        if (plugin.name === "northwestern-starlight-theme") {
            console.warn(
                "[northwestern-starlight-theme] `northwesternTheme()` was found in `plugins` — " +
                    "the config helper adds it automatically. Remove it from `plugins` to avoid " +
                    "double-registration. Use the `theme` key for options instead.",
            );
        }
    }

    // Build theme config, handling mermaid dual-path.
    // The standalone northwesternMermaid() integration MUST be added before starlight()
    // so its remark plugin processes mermaid code blocks before expressive-code.
    // The theme's built-in mermaid (via addIntegration inside config:setup) runs too late.
    const themeConfig: NorthwesternThemeConfig = { ...theme };
    let mermaidIntegration: AstroIntegration | undefined;

    if (typeof mermaid === "object") {
        // Standalone integration with custom options; disable the theme's built-in
        themeConfig.mermaid = false;
        mermaidIntegration = northwesternMermaid(mermaid);
    } else if (mermaid) {
        // Auto-detect: add standalone integration (handles toolbar + dark mode),
        // disable theme's built-in to prevent double-registration
        themeConfig.mermaid = false;
        mermaidIntegration = northwesternMermaid();
    } else {
        themeConfig.mermaid = false;
    }

    // Build Expressive Code config: GitHub themes + line-numbers plugin.
    // Merge with any user-provided expressiveCode settings.
    const { expressiveCode: userExpressiveCode, ...restStarlightConfig } = starlightConfig;
    const expressiveCodeConfig = {
        plugins: [pluginLineNumbers()],
        defaultProps: { showLineNumbers: false },
        themes: ["github-dark", "github-light"] as const,
        useStarlightUiThemeColors: true,
        ...(typeof userExpressiveCode === "object" ? userExpressiveCode : {}),
    };

    // Build integration array: before → [mermaid] → starlight → after
    const integrations: AstroIntegration[] = [
        ...(extraIntegrations?.before ?? []),
        ...(mermaidIntegration ? [mermaidIntegration] : []),
        starlight({
            ...restStarlightConfig,
            expressiveCode: expressiveCodeConfig,
            plugins: [northwesternTheme(themeConfig), ...plugins],
        }),
        ...(extraIntegrations?.after ?? []),
    ];

    return {
        ...astroConfig,
        integrations,
        vite: {
            ...astroConfig.vite,
            plugins: [...((astroConfig.vite?.plugins as Array<unknown>) ?? []), northwesternEcVitePlugin()],
        },
    };
}
