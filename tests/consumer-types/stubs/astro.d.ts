declare module "astro" {
    export interface AstroIntegration {
        name: string;
        hooks: Record<string, unknown>;
    }

    export interface AstroUserConfig {
        site?: string;
        base?: string;
        integrations?: AstroIntegration[];
        vite?: {
            plugins?: unknown | unknown[];
        };
        [key: string]: unknown;
    }
}
