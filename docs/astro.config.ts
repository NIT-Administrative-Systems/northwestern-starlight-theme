import starlight from "@astrojs/starlight";
import northwesternTheme from "@nu-appdev/northwestern-starlight-theme";
import { northwesternMermaid } from "@nu-appdev/northwestern-starlight-theme/mermaid";
import { defineConfig } from "astro/config";
import starlightChangelogs, { makeChangelogsSidebarLinks } from "starlight-changelogs";

export default defineConfig({
    site: "https://starlight-theme.entapp.northwestern.edu",
    devToolbar: {
        enabled: false,
    },
    integrations: [
        northwesternMermaid(),
        starlight({
            plugins: [northwesternTheme({ homepage: { layout: "split" } }), starlightChangelogs()],
            title: "Northwestern Starlight Theme",
            favicon: "/favicon.ico",
            editLink: {
                baseUrl: "https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/edit/main/docs/",
            },
            sidebar: [
                {
                    label: "Start Here",
                    items: ["getting-started", "customization"],
                },
                {
                    label: "Examples",
                    autogenerate: { directory: "examples" },
                },
                {
                    label: "Changelog",
                    items: makeChangelogsSidebarLinks([
                        { type: "recent", base: "changelog", count: 5 },
                        { type: "all", base: "changelog", label: "Version History" },
                    ]),
                },
            ],
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme",
                },
            ],
        }),
    ],
});
