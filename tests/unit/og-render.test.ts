import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeText, loadFont, loadSatoriFonts } from "../../packages/northwestern-starlight-theme/src/og/render.ts";

/** Fonts are cached by URL, failures included, so every test needs its own URL. */
let fontCounter = 0;
function fontURL(name: string) {
    fontCounter += 1;
    return `https://common.northwestern.edu/fonts/${name}-${fontCounter}.woff`;
}

function okResponse() {
    return { ok: true, status: 200, statusText: "OK", arrayBuffer: async () => new ArrayBuffer(8) };
}

function errorResponse(status: number, statusText: string) {
    return { ok: false, status, statusText };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * Drive a font load past the retry backoff without waiting for it in real time.
 *
 * The result is captured before the timers run so a rejection is never left
 * unhandled while the fake clock advances.
 */
async function runWithTimers<T>(operation: () => Promise<T>): Promise<T> {
    const settled = operation().then(
        (value) => () => value,
        (error) => () => {
            throw error;
        },
    );
    await vi.runAllTimersAsync();
    return (await settled)();
}

describe("loadFont", () => {
    it("includes the font URL and HTTP status when a remote font request is not ok", async () => {
        const url = fontURL("unavailable");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => errorResponse(503, "Service Unavailable")),
        );

        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow(
            `Failed to fetch OG font from ${url}: HTTP 503 Service Unavailable`,
        );
    });

    it("includes the font URL when a remote font request throws", async () => {
        const url = fontURL("network-failure");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("fetch failed");
            }),
        );

        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow(
            `Failed to fetch OG font from ${url}: fetch failed`,
        );
    });

    it("retries a network failure and succeeds when the CDN comes back", async () => {
        const url = fontURL("transient");
        const fetchMock = vi.fn(async () => {
            if (fetchMock.mock.calls.length < 3) throw new Error("fetch failed");
            return okResponse();
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(runWithTimers(() => loadFont(url))).resolves.toBeInstanceOf(ArrayBuffer);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("gives up after three attempts on a 5xx", async () => {
        const url = fontURL("always-503");
        const fetchMock = vi.fn(async () => errorResponse(503, "Service Unavailable"));
        vi.stubGlobal("fetch", fetchMock);

        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow("HTTP 503");
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("does not retry a 4xx, which is a wrong URL rather than a blip", async () => {
        const url = fontURL("missing");
        const fetchMock = vi.fn(async () => errorResponse(404, "Not Found"));
        vi.stubGlobal("fetch", fetchMock);

        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow(
            `Failed to fetch OG font from ${url}: HTTP 404 Not Found`,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("gives every request a timeout so a hung CDN cannot stall the build", async () => {
        const url = fontURL("timeout-signal");
        const fetchMock = vi.fn(async () => okResponse());
        vi.stubGlobal("fetch", fetchMock);

        await runWithTimers(() => loadFont(url));

        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("caches a failure so the whole retry sequence is not repeated for every page", async () => {
        const url = fontURL("cached-failure");
        const fetchMock = vi.fn(async () => errorResponse(503, "Service Unavailable"));
        vi.stubGlobal("fetch", fetchMock);

        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow("HTTP 503");
        await expect(runWithTimers(() => loadFont(url))).rejects.toThrow("HTTP 503");
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});

describe("loadSatoriFonts", () => {
    it("names each family from its URL", async () => {
        const poppins = fontURL("Poppins-Bold");
        const akkurat = fontURL("AkkuratProRegular");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => okResponse()),
        );

        const fonts = await runWithTimers(() => loadSatoriFonts([poppins, akkurat]));

        expect(fonts.map((font) => font.name)).toEqual(["Poppins", "Akkurat Pro"]);
    });

    it("renders with the fonts that loaded and warns about the one that did not", async () => {
        const poppins = fontURL("Poppins-Bold");
        const akkurat = fontURL("AkkuratProRegular");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.stubGlobal(
            "fetch",
            vi.fn(async (url: string) => (url === akkurat ? errorResponse(503, "Service Unavailable") : okResponse())),
        );

        const fonts = await runWithTimers(() => loadSatoriFonts([poppins, akkurat]));

        expect(fonts.map((font) => font.name)).toEqual(["Poppins"]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain(`OG font unavailable, rendering without it`);

        // Every later page reuses the cached failure without warning again.
        await runWithTimers(() => loadSatoriFonts([poppins, akkurat]));
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("throws when no font could be loaded, because satori needs at least one", async () => {
        const url = fontURL("all-down");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => errorResponse(503, "Service Unavailable")),
        );

        await expect(runWithTimers(() => loadSatoriFonts([url]))).rejects.toThrow("No OG fonts could be loaded");
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
