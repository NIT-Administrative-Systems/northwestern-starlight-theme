import { describe, expect, it } from "vitest";
import { northwesternExpressiveCode } from "../../packages/northwestern-starlight-theme/expressive-code.ts";

describe("northwesternExpressiveCode", () => {
    it("includes line-numbers plugin with showLineNumbers disabled by default", () => {
        const config = northwesternExpressiveCode();
        expect(config.plugins).toBeDefined();
        const names = config.plugins!.map((p) => (p as { name: string }).name);
        expect(names).toContain("Line numbers");
        expect(config.defaultProps?.showLineNumbers).toBe(false);
    });

    it("preserves user plugins", () => {
        const custom = { name: "custom-plugin" };
        const config = northwesternExpressiveCode({ plugins: [custom as never] });
        const names = config.plugins!.map((p) => (p as { name: string }).name);
        expect(names).toContain("Line numbers");
        expect(names).toContain("custom-plugin");
    });

    it("puts line-numbers plugin first", () => {
        const custom = { name: "custom-plugin" };
        const config = northwesternExpressiveCode({ plugins: [custom as never] });
        expect((config.plugins![0] as { name: string }).name).toBe("Line numbers");
    });

    it("lets user defaultProps override the defaults", () => {
        const config = northwesternExpressiveCode({
            defaultProps: { showLineNumbers: true },
        });
        expect(config.defaultProps?.showLineNumbers).toBe(true);
    });

    it("passes through extra config", () => {
        const config = northwesternExpressiveCode({
            themes: ["dracula"] as never,
        });
        expect((config as Record<string, unknown>).themes).toEqual(["dracula"]);
    });
});
