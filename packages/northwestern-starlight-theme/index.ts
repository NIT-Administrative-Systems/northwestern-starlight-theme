import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StarlightPlugin } from "@astrojs/starlight/types";
import type { z } from "zod";
import {
    nonEmptyStringSchema,
    type northwesternHomepageConfigSchema,
    northwesternThemeConfigSchema,
    validateSchema,
} from "./src/config-schema.ts";
import rehypeTableScroll from "./src/rehype-table-scroll.ts";

/**
 * Configuration for the homepage hero section.
 *
 * Controls hero layout, title visibility, and image sizing. Passed as the
 * `homepage` property of {@link NorthwesternThemeConfig}.
 *
 * @example
 * ```ts
 * northwesternTheme({
 *     homepage: {
 *         layout: "split",
 *         showTitle: false,
 *         imageWidth: "750px",
 *     },
 * })
 * ```
 */
export type NorthwesternHomepageConfig = z.infer<typeof northwesternHomepageConfigSchema>;

/**
 * Top-level configuration for the Northwestern Starlight theme plugin.
 *
 * With `defineNorthwesternConfig`, pass these as the `theme` key.
 * With `northwesternTheme()` directly, pass them as the function argument.
 * All properties are optional.
 *
 * @example
 * ```ts
 * defineNorthwesternConfig({
 *     starlight: { title: "My Docs" },
 *     theme: { homepage: { layout: "split" } },
 * })
 * ```
 *
 * @see {@link NorthwesternHomepageConfig} for homepage hero options
 */
export type NorthwesternThemeConfig = z.infer<typeof northwesternThemeConfigSchema>;

function getSiteTitle(title: unknown): string {
    const parsedTitle = nonEmptyStringSchema.safeParse(title);
    if (parsedTitle.success) return parsedTitle.data;
    if (title && typeof title === "object") {
        for (const value of Object.values(title as Record<string, unknown>)) {
            const parsedValue = nonEmptyStringSchema.safeParse(value);
            if (parsedValue.success) return parsedValue.data;
        }
    }
    return "";
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

/**
 * Create a Northwestern-branded Starlight theme plugin.
 *
 * Registers Northwestern typography (Akkurat Pro, Poppins), purple color palette,
 * component overrides (Hero, ThemeToggle, EditLink), and optional Mermaid diagram
 * support with branded color schemes.
 *
 * **Recommended:** Use {@link https://github.com/NUAppDev/northwestern-starlight-theme | defineNorthwesternConfig}
 * from `@nu-appdev/northwestern-starlight-theme/config` instead. It handles
 * integration ordering, Mermaid, and Expressive Code (line numbers, GitHub themes).
 *
 * @param config - Theme configuration. All properties optional.
 * @returns A Starlight plugin to pass to `plugins` in your Starlight config.
 *
 * @example Manual setup
 * ```ts
 * starlight({ plugins: [northwesternTheme()] })
 * ```
 *
 * @example Split hero with Mermaid disabled
 * ```ts
 * starlight({
 *     plugins: [
 *         northwesternTheme({
 *             homepage: { layout: "split", showTitle: false },
 *             mermaid: false,
 *         }),
 *     ],
 * })
 * ```
 */
export default function northwesternTheme(config: NorthwesternThemeConfig = {}): StarlightPlugin {
    const {
        homepage = {},
        mermaid = true,
        ogImage = true,
    } = validateSchema(northwesternThemeConfigSchema, config, "theme config");
    const themeConfig = {
        homepage: {
            layout: homepage.layout ?? "centered",
            showTitle: homepage.showTitle ?? true,
            imageWidth: homepage.imageWidth ?? "500px",
        },
        ogImage: {
            enabled: false, // set to true in config:setup when ogImage is enabled
            siteTitle: "",
            logoPath: "",
            resvgWasmPath: "",
        },
    };

    return {
        name: "northwestern-starlight-theme",
        hooks: {
            async "config:setup"({
                config: starlightConfig,
                updateConfig,
                addIntegration,
                addRouteMiddleware,
                logger,
            }) {
                // Apply default favicon if consumer hasn't set one
                const consumerSetFavicon =
                    starlightConfig.favicon &&
                    (starlightConfig.favicon as unknown as { href: string }).href !== "/favicon.svg";

                // Read favicon bytes once for the Vite plugin to serve
                const faviconPath = join(dirname(fileURLToPath(import.meta.url)), "src", "favicon.png");
                const faviconBytes = consumerSetFavicon ? null : readFileSync(faviconPath);

                addIntegration({
                    name: "northwestern-theme-config",
                    hooks: {
                        "astro:config:setup": ({ updateConfig: updateAstroConfig }) => {
                            updateAstroConfig({
                                markdown: {
                                    rehypePlugins: [rehypeTableScroll],
                                },
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
                                        // Serve the bundled favicon during dev — no file touches public/
                                        ...(faviconBytes
                                            ? [
                                                  {
                                                      name: "northwestern-theme-favicon",
                                                      configureServer(server: {
                                                          middlewares: {
                                                              use(
                                                                  fn: (
                                                                      req: IncomingMessage,
                                                                      res: ServerResponse,
                                                                      next: () => void,
                                                                  ) => void,
                                                              ): void;
                                                          };
                                                      }) {
                                                          server.middlewares.use((req, res, next) => {
                                                              if (req.url === "/favicon.png") {
                                                                  res.setHeader("Content-Type", "image/png");
                                                                  res.setHeader(
                                                                      "Cache-Control",
                                                                      "public, max-age=31536000, immutable",
                                                                  );
                                                                  res.end(faviconBytes);
                                                              } else {
                                                                  next();
                                                              }
                                                          });
                                                      },
                                                  },
                                              ]
                                            : []),
                                    ],
                                },
                            });
                        },
                        // Copy favicon into build output so nothing touches public/
                        "astro:build:done": ({ dir }) => {
                            if (faviconBytes) {
                                const dest = join(fileURLToPath(dir), "favicon.png");
                                mkdirSync(dirname(dest), { recursive: true });
                                copyFileSync(faviconPath, dest);
                            }
                        },
                    },
                });
                // Detect Mermaid availability
                let mermaidEnabled = mermaid;

                if (mermaidEnabled) {
                    const hasMermaid = await canResolve("astro-mermaid");

                    if (!hasMermaid) {
                        if (typeof mermaid === "object") {
                            // User explicitly configured Mermaid but it's not installed
                            logger.warn(
                                'Mermaid config was provided but "astro-mermaid" and "mermaid" are not installed.\n' +
                                    "  Run: pnpm add astro-mermaid mermaid",
                            );
                        }
                        mermaidEnabled = false;
                    }
                }

                // OG image generation (bundled via satori + @resvg/resvg-wasm)
                if (ogImage) {
                    const siteTitle = getSiteTitle(starlightConfig.title);

                    if (!siteTitle) {
                        logger.warn(
                            "Open Graph image generation was disabled because Starlight `title` is empty.\n" +
                                "  Set `title` in starlight({...}) so OG images and structured data have a site name.",
                        );
                    } else {
                        themeConfig.ogImage.logoPath = faviconPath;
                        themeConfig.ogImage.siteTitle = siteTitle;

                        addRouteMiddleware({
                            entrypoint: "@nu-appdev/northwestern-starlight-theme/src/og/route-middleware",
                            order: "post",
                        });

                        addIntegration({
                            name: "northwestern-theme-og-image",
                            hooks: {
                                "astro:config:setup": ({ config: astroConfig, injectRoute }) => {
                                    if (!astroConfig.site) {
                                        logger.warn(
                                            "Open Graph image generation was disabled because `site` is not set.\n" +
                                                "  Set `site` in astro.config.ts to enable absolute OG image URLs.",
                                        );
                                        return;
                                    }

                                    themeConfig.ogImage.enabled = true;
                                    const require = createRequire(import.meta.url);
                                    themeConfig.ogImage.resvgWasmPath = require.resolve(
                                        "@resvg/resvg-wasm/index_bg.wasm",
                                    );

                                    injectRoute({
                                        pattern: "/og/[...slug]",
                                        entrypoint: "@nu-appdev/northwestern-starlight-theme/src/og/endpoint.ts",
                                    });
                                    logger.info("OG image generation enabled");
                                },
                            },
                        });
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
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/blockquotes.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/footnotes.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/tables.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/cards.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/utility-surfaces.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/steps.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/code.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/tabs.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/components/mermaid.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/mermaid-toolbar.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/openapi.css",
                        "@nu-appdev/northwestern-starlight-theme/src/styles/a11y.css",
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
