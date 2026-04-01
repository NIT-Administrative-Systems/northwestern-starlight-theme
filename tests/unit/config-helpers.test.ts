import { describe, expect, it } from "vitest";
import { mergeStarlightPlugins } from "../../packages/northwestern-starlight-theme/config.ts";

type TestPlugin = {
    name?: string;
    hooks: Record<string, never>;
};

describe("mergeStarlightPlugins", () => {
    it("places the theme plugin first, then migrated starlight.plugins, then helper plugins", () => {
        const themePlugin = { name: "northwestern-starlight-theme", hooks: {} } satisfies TestPlugin;
        const migratedPlugin = { name: "migrated-plugin", hooks: {} } satisfies TestPlugin;
        const helperPlugin = { name: "helper-plugin", hooks: {} } satisfies TestPlugin;

        const merged = mergeStarlightPlugins(themePlugin, [migratedPlugin], [helperPlugin]);

        expect(merged.map((plugin) => plugin.name)).toEqual([
            "northwestern-starlight-theme",
            "migrated-plugin",
            "helper-plugin",
        ]);
    });

    it("dedupes duplicate named plugins across migrated and helper arrays", () => {
        const themePlugin = { name: "northwestern-starlight-theme", hooks: {} } satisfies TestPlugin;
        const duplicateA = { name: "duplicate-plugin", hooks: {} } satisfies TestPlugin;
        const duplicateB = { name: "duplicate-plugin", hooks: {} } satisfies TestPlugin;

        const merged = mergeStarlightPlugins(themePlugin, [duplicateA], [duplicateB]);

        expect(merged.map((plugin) => plugin.name)).toEqual(["northwestern-starlight-theme", "duplicate-plugin"]);
    });

    it("preserves unnamed plugins because they cannot be deduped safely", () => {
        const themePlugin = { name: "northwestern-starlight-theme", hooks: {} } satisfies TestPlugin;
        const unnamedA = { hooks: {} } as TestPlugin;
        const unnamedB = { hooks: {} } as TestPlugin;

        const merged = mergeStarlightPlugins(themePlugin, [unnamedA], [unnamedB]);

        expect(merged).toEqual([themePlugin, unnamedA, unnamedB]);
    });
});
