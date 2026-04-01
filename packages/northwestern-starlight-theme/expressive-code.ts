import type { StarlightExpressiveCodeOptions } from "@astrojs/starlight/expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

/**
 * Pre-configured Expressive Code options for the Northwestern Starlight theme.
 *
 * Adds the line-numbers plugin and sets sensible defaults. Pass your own
 * options to merge with the Northwestern defaults.
 *
 * @example
 * ```ts
 * import { northwesternExpressiveCode } from "@nu-appdev/northwestern-starlight-theme/expressive-code";
 *
 * starlight({
 *     expressiveCode: northwesternExpressiveCode(),
 * })
 * ```
 */
export function northwesternExpressiveCode(
    config: StarlightExpressiveCodeOptions = {},
): StarlightExpressiveCodeOptions {
    const { defaultProps, plugins, ...rest } = config;

    return {
        ...rest,
        plugins: [pluginLineNumbers(), ...(plugins ?? [])],
        defaultProps: {
            showLineNumbers: false,
            ...(defaultProps ?? {}),
        },
    };
}
