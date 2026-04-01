declare module "*.jsonc?raw" {
    const value: string;
    export default value;
}

declare module "astro:content" {
    export const getCollection: unknown;
    export const defineCollection: unknown;
}

declare module "virtual:starlight/user-config" {
    const value: unknown;
    export default value;
}

declare module "virtual:starlight/project-context" {
    const value: unknown;
    export default value;
}

declare module "virtual:starlight/plugin-translations" {
    const value: unknown;
    export default value;
}

declare namespace StarlightApp {
    interface I18nStrategy {
        defaultLocale?: string;
    }
}
