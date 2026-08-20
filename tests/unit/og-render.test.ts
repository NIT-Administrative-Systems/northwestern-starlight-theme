import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeText, loadFont } from "../../packages/northwestern-starlight-theme/src/og/render.ts";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("loadFont", () => {
    it("includes the font URL and HTTP status when a remote font request is not ok", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                ok: false,
                status: 503,
                statusText: "Service Unavailable",
            })),
        );

        expect(loadFont("https://common.northwestern.edu/fonts/test-font.ttf")).rejects.toThrow(
            "Failed to fetch OG font from https://common.northwestern.edu/fonts/test-font.ttf: HTTP 503 Service Unavailable",
        );
    });

    it("includes the font URL when a remote font request throws", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("fetch failed");
            }),
        );

        expect(loadFont("https://common.northwestern.edu/fonts/network-failure.ttf")).rejects.toThrow(
            "Failed to fetch OG font from https://common.northwestern.edu/fonts/network-failure.ttf: fetch failed",
        );
    });
});

describe("decodeText", () => {
    it("decodes the entities Starlight escapes", () => {
        expect(decodeText("Tips &amp; tricks for &lt;Code&gt; &quot;blocks&quot; you&#39;ve used")).toBe(
            `Tips & tricks for <Code> "blocks" you've used`,
        );
    });

    it("does not unescape twice", () => {
        // `&amp;lt;` is the escaped text `&lt;`. Decoding `&amp;` first would turn
        // it into `&lt;` and then into `<`, inventing markup the page never had.
        expect(decodeText("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;");
        expect(decodeText("Cats &amp;amp; dogs")).toBe("Cats &amp; dogs");
    });

    it("leaves text without entities untouched", () => {
        expect(decodeText("Plain title & a stray ; semicolon")).toBe("Plain title & a stray ; semicolon");
    });
});
