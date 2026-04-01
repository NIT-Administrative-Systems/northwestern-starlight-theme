declare module "@astrojs/starlight/types" {
    export interface StarlightPlugin {
        name: string;
        hooks: Record<string, unknown>;
    }

    export interface StarlightUserConfig {
        title?: string | Record<string, string>;
        sidebar?: unknown[];
        plugins?: StarlightPlugin[];
        expressiveCode?: boolean | Record<string, unknown>;
        [key: string]: unknown;
    }
}
