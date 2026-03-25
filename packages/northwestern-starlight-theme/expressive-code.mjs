import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

/**
 * @param {import("@astrojs/starlight/expressive-code").StarlightExpressiveCodeOptions} [config]
 * @returns {import("@astrojs/starlight/expressive-code").StarlightExpressiveCodeOptions}
 */
export function northwesternExpressiveCode(config = {}) {
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
