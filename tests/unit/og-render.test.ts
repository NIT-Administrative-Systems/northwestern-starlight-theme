import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFont } from "../../packages/northwestern-starlight-theme/src/og/render.ts";

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
