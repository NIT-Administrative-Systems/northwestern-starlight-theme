import type { NorthwesternConfigOptions } from "../../packages/northwestern-starlight-theme/dist/config";
import type { NorthwesternThemeConfig } from "../../packages/northwestern-starlight-theme/dist/index";
import type { NorthwesternMermaidOptions } from "../../packages/northwestern-starlight-theme/dist/mermaid";

const themeConfig: NorthwesternThemeConfig = {
    homepage: {
        layout: "split",
        showTitle: false,
        imageWidth: "750px",
    },
    mermaid: false,
    ogImage: true,
};

const mermaidOptions: NorthwesternMermaidOptions = {
    toolbar: false,
};

const configOptions: NorthwesternConfigOptions = {
    site: "https://docs.example.northwestern.edu",
    starlight: {
        title: "My Docs",
    },
    theme: themeConfig,
    mermaid: mermaidOptions,
};

void themeConfig;
void mermaidOptions;
void configOptions;
