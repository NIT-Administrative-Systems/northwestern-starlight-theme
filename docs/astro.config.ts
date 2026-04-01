import { defineNorthwesternConfig } from "@nu-appdev/northwestern-starlight-theme/config";
import starlightChangelogs, { makeChangelogsSidebarLinks } from "starlight-changelogs";

export default defineNorthwesternConfig({
    site: "https://starlight-theme.entapp.northwestern.edu",
    devToolbar: {
        enabled: false,
    },
    starlight: {
        title: "Northwestern Starlight Theme",
        editLink: {
            baseUrl: "https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/edit/main/docs/",
        },
        sidebar: [
            {
                label: "Start Here",
                items: ["getting-started", "customization"],
            },
            {
                label: "Components",
                autogenerate: { directory: "components" },
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
    },
    theme: { homepage: { layout: "split" } },
    plugins: [starlightChangelogs()],
});
