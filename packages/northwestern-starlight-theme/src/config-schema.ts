import { z } from "zod";

/**
 * Non-empty string helper used when reading titles from mixed Starlight config shapes.
 *
 * Trims surrounding whitespace and rejects empty strings after trimming.
 */
export const nonEmptyStringSchema = z
    .string()
    .trim()
    .min(1)
    .meta({ description: "A non-empty string with surrounding whitespace removed." });

/**
 * CSS pixel length helper used for hero image sizing.
 *
 * Restricts values to explicit pixel lengths so consumers get deterministic
 * hero sizing and friendly validation errors for malformed values.
 */
const pixelLengthSchema = z
    .string()
    .trim()
    .regex(/^\d+px$/, 'Expected a pixel value like "500px".')
    .meta({
        description: 'A CSS pixel length such as "500px" or "750px".',
        examples: ["500px", "750px", "1000px"],
    });

/**
 * Configuration for the homepage hero section.
 *
 * Controls hero layout, title visibility, and image sizing. This is used as
 * the `homepage` property of the top-level theme config.
 */
const northwesternHomepageConfigSchema = z
    .strictObject({
        /**
         * Hero layout style.
         *
         * - `"centered"`: image above title, all content centered
         * - `"split"`: text and actions on the left, image on the right
         */
        layout: z.enum(["centered", "split"]).meta({
            description: 'Hero layout style. Use "centered" for a stacked hero or "split" for a two-column layout.',
            examples: ["centered", "split"],
        }),

        /**
         * Whether to display the page title inside the hero.
         *
         * Set this to `false` when the hero image already contains the title
         * as part of a branded lockup.
         */
        showTitle: z.boolean().meta({
            description: "Whether to render the page title inside the hero section.",
        }),

        /**
         * Maximum width of the hero image in the centered layout.
         *
         * Use a larger value for wide lockup images that would otherwise feel cramped.
         */
        imageWidth: pixelLengthSchema.meta({
            description: "Maximum width of the hero image in the centered layout, expressed in pixels.",
            examples: ["500px", "750px"],
        }),
    })
    .partial()
    .meta({
        description: "Homepage hero configuration. Controls layout, title visibility, and hero image sizing.",
    });

/**
 * Top-level configuration for the Northwestern Starlight theme plugin.
 *
 * With `defineNorthwesternConfig`, pass this object as the `theme` key.
 * With `northwesternTheme()` directly, pass it as the function argument.
 */
export const northwesternThemeConfigSchema = z
    .strictObject({
        /**
         * Homepage hero layout configuration.
         */
        homepage: northwesternHomepageConfigSchema.optional().meta({
            description: "Homepage hero configuration.",
        }),

        /**
         * Mermaid diagram support.
         *
         * - `true`: auto-detect Mermaid packages and enable support when available
         * - `false`: disable Mermaid integration entirely
         * - `object`: merge custom Mermaid options with Northwestern defaults
         */
        mermaid: z
            .union([z.boolean(), z.record(z.string(), z.unknown())])
            .optional()
            .meta({
                description:
                    "Mermaid support toggle or override object. Use true to auto-detect, false to disable, or an object to merge custom Mermaid options.",
            }),

        /**
         * Open Graph image generation.
         *
         * Generates a branded 1200x630 image for each docs page when `site`
         * is configured in `astro.config.ts`.
         */
        ogImage: z.boolean().optional().meta({
            description: "Whether to generate branded Open Graph images for docs pages.",
        }),
    })
    .meta({
        description: "Top-level Northwestern theme plugin configuration.",
    });

/**
 * Configuration options for the standalone Northwestern Mermaid integration.
 *
 * This intentionally validates only the Northwestern-owned wrapper surface and
 * allows additional upstream `astro-mermaid` options to pass through unchanged.
 */
export const northwesternMermaidOptionsSchema = z
    .looseObject({
        /**
         * Show the hover toolbar on rendered diagrams.
         *
         * The toolbar provides fullscreen, download, and copy-source actions.
         */
        toolbar: z.boolean().optional().meta({
            description: "Whether to show the Mermaid hover toolbar with fullscreen, download, and copy actions.",
        }),
    })
    .meta({
        description:
            "Northwestern Mermaid integration options. Supports the `toolbar` toggle plus passthrough astro-mermaid options.",
    });

/**
 * Configuration options for `defineNorthwesternConfig()`.
 *
 * This schema validates the Northwestern-owned wrapper surface while allowing
 * the rest of Astro's top-level config to pass through untouched.
 */
export const northwesternConfigOptionsSchema = z
    .looseObject({
        /**
         * Full Starlight configuration object.
         *
         * This is forwarded to `starlight()` after Northwestern defaults and
         * helper-managed integration ordering are applied.
         */
        starlight: z.looseObject({}).meta({
            description: "Full Starlight configuration object passed through to the Starlight integration.",
        }),

        /**
         * Northwestern theme plugin options.
         */
        theme: northwesternThemeConfigSchema.optional().meta({
            description: "Northwestern theme plugin options.",
        }),

        /**
         * Mermaid diagram support.
         *
         * - `true`: add Northwestern Mermaid with defaults
         * - `false`: disable Mermaid
         * - `object`: add Northwestern Mermaid with custom options
         */
        mermaid: z.union([z.boolean(), northwesternMermaidOptionsSchema]).optional().meta({
            description:
                "Mermaid integration toggle or options object. Use true for defaults, false to disable, or an object for custom Mermaid behavior.",
        }),

        /**
         * Additional Starlight plugins to register after the Northwestern theme.
         */
        plugins: z.array(z.unknown()).optional().meta({
            description: "Additional Starlight plugins to append after the Northwestern theme plugin.",
        }),

        /**
         * Escape hatch for advanced integration ordering.
         *
         * Use `before` for integrations that must run before Mermaid/Starlight,
         * and `after` for integrations that should be appended after Starlight.
         */
        integrations: z
            .strictObject({
                /**
                 * Integrations added before Mermaid and Starlight.
                 */
                before: z.array(z.unknown()).optional().meta({
                    description: "Astro integrations to register before Mermaid and Starlight.",
                }),

                /**
                 * Integrations added after Starlight.
                 */
                after: z.array(z.unknown()).optional().meta({
                    description: "Astro integrations to register after Starlight.",
                }),
            })
            .optional()
            .meta({
                description: "Advanced integration ordering overrides.",
            }),
    })
    .meta({
        description: "Options for defineNorthwesternConfig(), combining Astro config with Northwestern-specific keys.",
    });

function formatIssuePath(path: PropertyKey[]): string {
    return path.length > 0 ? path.join(".") : "config";
}

/**
 * Format Zod validation errors as stable, package-prefixed user-facing messages.
 *
 * The goal is to fail fast with errors that point directly at the bad config
 * path instead of surfacing cryptic downstream behavior.
 */
function formatValidationError(scope: string, error: z.ZodError): string {
    const lines = error.issues.map((issue) => {
        if (issue.code === "unrecognized_keys") {
            const basePath = formatIssuePath(issue.path);
            return issue.keys
                .map((key) => `${basePath === "config" ? key : `${basePath}.${key}`}: Unrecognized key.`)
                .join("\n");
        }

        return `${formatIssuePath(issue.path)}: ${issue.message}`;
    });

    return [`[northwestern-starlight-theme] Invalid ${scope}.`, ...lines.map((line) => `  - ${line}`)].join("\n");
}

/**
 * Validate a public config object and throw a friendly package-scoped error on failure.
 */
export function validateSchema<T>(schema: z.ZodType<T>, value: unknown, scope: string): T {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        throw new Error(formatValidationError(scope, parsed.error));
    }

    return parsed.data;
}
