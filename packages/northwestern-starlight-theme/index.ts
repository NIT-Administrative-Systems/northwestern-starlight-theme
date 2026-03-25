import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StarlightPlugin } from "@astrojs/starlight/types";

export interface NorthwesternHomepageConfig {
    /**
     * Hero layout style.
     *
     * - `"centered"` (default) — image above title, everything centered
     * - `"split"` — text + buttons on the left, image on the right (60/40 split)
     */
    layout?: "centered" | "split";

    /**
     * Whether to display the page title in the hero.
     *
     * Set to `false` when the hero image is a lockup that already contains the title.
     *
     * @default true
     */
    showTitle?: boolean;
}

export interface NorthwesternThemeConfig {
    /**
     * Homepage hero layout configuration.
     */
    homepage?: NorthwesternHomepageConfig;

    /**
     * Mermaid diagram support.
     *
     * - `true` (default) — auto-detect: enables mermaid if `astro-mermaid` and `mermaid`
     *   are installed, skips silently if they are not
     * - `false` — disables mermaid entirely
     * - `object` — enables mermaid with custom config (merged with Northwestern defaults)
     */
    mermaid?: boolean | Record<string, unknown>;
}

/**
 * Try to resolve a module. Returns true if it can be imported.
 */
async function canResolve(id: string): Promise<boolean> {
    try {
        await import(/* @vite-ignore */ id);
        return true;
    } catch {
        return false;
    }
}

const VIRTUAL_MODULE_ID = "virtual:northwestern-theme/config";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export default function northwesternTheme(config: NorthwesternThemeConfig = {}): StarlightPlugin {
    const { homepage = {}, mermaid = true } = config;
    const themeConfig = { homepage: { layout: homepage.layout ?? "centered", showTitle: homepage.showTitle ?? true } };

    return {
        name: "northwestern-starlight-theme",
        hooks: {
            async "config:setup"({ config: starlightConfig, updateConfig, addIntegration, logger }) {
                // Apply default favicon if consumer hasn't set one
                const consumerSetFavicon =
                    starlightConfig.favicon && (starlightConfig.favicon as { href: string }).href !== "/favicon.svg";

                addIntegration({
                    name: "northwestern-theme-config",
                    hooks: {
                        "astro:config:setup": ({ config: astroConfig, updateConfig: updateAstroConfig }) => {
                            // Copy bundled favicon to public/ if consumer hasn't set a custom one
                            if (!consumerSetFavicon) {
                                const publicDir =
                                    astroConfig.publicDir instanceof URL
                                        ? fileURLToPath(astroConfig.publicDir)
                                        : String(astroConfig.publicDir);
                                const dest = join(publicDir, "favicon.png");

                                if (!existsSync(dest)) {
                                    const src = join(dirname(fileURLToPath(import.meta.url)), "src", "favicon.png");
                                    mkdirSync(dirname(dest), { recursive: true });
                                    copyFileSync(src, dest);
                                    logger.info("Copied Northwestern favicon to public/favicon.png");
                                }
                            }

                            updateAstroConfig({
                                vite: {
                                    plugins: [
                                        {
                                            name: "northwestern-theme-virtual-config",
                                            resolveId(id: string) {
                                                if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
                                            },
                                            load(id: string) {
                                                if (id === RESOLVED_VIRTUAL_MODULE_ID) {
                                                    return `export default ${JSON.stringify(themeConfig)};`;
                                                }
                                            },
                                        },
                                    ],
                                },
                            });
                        },
                    },
                });
                // Detect mermaid availability
                let mermaidEnabled = mermaid !== false;

                if (mermaidEnabled) {
                    const hasMermaid = await canResolve("astro-mermaid");

                    if (!hasMermaid) {
                        if (typeof mermaid === "object") {
                            // User explicitly configured mermaid but it's not installed
                            logger.warn(
                                'Mermaid config was provided but "astro-mermaid" and "mermaid" are not installed.\n' +
                                    "  Run: pnpm add astro-mermaid mermaid",
                            );
                        }
                        mermaidEnabled = false;
                    }
                }

                updateConfig({
                    ...(consumerSetFavicon ? {} : { favicon: "/favicon.png" }),
                    components: {
                        ...(starlightConfig.components ?? {}),
                        Hero:
                            starlightConfig.components?.Hero ??
                            "@nu-appdev/northwestern-starlight-theme/src/components/Hero.astro",
                        EditLink:
                            starlightConfig.components?.EditLink ??
                            "@nu-appdev/northwestern-starlight-theme/src/components/ConditionalEditLink.astro",
                        ThemeSelect:
                            starlightConfig.components?.ThemeSelect ??
                            "@nu-appdev/northwestern-starlight-theme/src/components/ThemeToggle.astro",
                    },
                    customCss: [
                        "@nu-appdev/northwestern-starlight-theme/src/styles/layers.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/variables.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/typography.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/theme.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/navigation.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/content.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/cards.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/utility-surfaces.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/steps.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/code.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/tabs.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/mermaid.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/mermaid-toolbar.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/openapi.css",
                        ...(starlightConfig.customCss ?? []),
                    ],
                    expressiveCode: {
                        themes: ["github-dark", "github-light"],
                        useStarlightUiThemeColors: true,
                        ...(typeof starlightConfig.expressiveCode === "object" ? starlightConfig.expressiveCode : {}),
                    },
                });

                if (mermaidEnabled) {
                    const { default: mermaidIntegration } = await import("astro-mermaid");
                    const { defaultMermaidConfig } = await import("./mermaid.ts");

                    const userOverrides = typeof mermaid === "object" ? (mermaid as Record<string, unknown>) : {};
                    const mergedConfig = {
                        ...defaultMermaidConfig,
                        ...userOverrides,
                        enableLog: false,
                        mermaidConfig: {
                            ...(defaultMermaidConfig.mermaidConfig ?? {}),
                            ...((userOverrides.mermaidConfig as Record<string, unknown>) ?? {}),
                            themeVariables: {
                                ...((defaultMermaidConfig.mermaidConfig as Record<string, unknown>)?.themeVariables ??
                                    {}),
                                ...(((userOverrides.mermaidConfig as Record<string, unknown>)?.themeVariables as Record<
                                    string,
                                    unknown
                                >) ?? {}),
                            },
                        },
                    };

                    addIntegration(mermaidIntegration(mergedConfig));
                    logger.info("Mermaid support enabled");
                }
            },
        },
    };
}
