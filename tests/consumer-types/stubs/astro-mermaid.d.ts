declare module "astro-mermaid" {
    export interface AstroMermaidOptions {
        theme?: string;
        autoTheme?: boolean;
        enableLog?: boolean;
        mermaidConfig?: Record<string, unknown>;
        [key: string]: unknown;
    }
}
