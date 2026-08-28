import fs from "node:fs/promises";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import satori from "satori";

type RGBColor = [r: number, g: number, b: number];
type FontWeight = string;

interface FontConfig {
    color?: RGBColor;
    size?: number;
    weight?: FontWeight;
    lineHeight?: number;
    families?: string[];
}

interface OGImageOptions {
    resvgWasmPath: string;
    title: string;
    description?: string;
    logo?: {
        path: string;
        size?: [width?: number, height?: number];
    };
    bgGradient?: RGBColor[];
    border?: {
        color?: RGBColor;
        width?: number;
    };
    padding?: number | [vertical: number, horizontal: number];
    font?: {
        title?: FontConfig;
        description?: FontConfig;
    };
    fonts?: string[];
}

const [width, height] = [1200, 630];

let wasmInitialized = false;
async function ensureWasm(wasmPath: string) {
    if (wasmInitialized) return;
    await initWasm(fs.readFile(wasmPath));
    wasmInitialized = true;
}

const fontWeightMap: Record<string, number> = {
    Normal: 400,
    Bold: 700,
    ExtraBold: 800,
};

function toFontWeight(weight: string): number {
    return fontWeightMap[weight] ?? 400;
}

const HTML_ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
};

/**
 * Decode the HTML entities Starlight escapes into page titles and descriptions.
 *
 * One pass, because decoding `&amp;` before the others would unescape twice:
 * `&amp;lt;` is the text `&lt;`, not `<`.
 *
 * @internal — exposed for unit tests.
 */
export function decodeText(text: string) {
    return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

function rgbToCSS(rgb: RGBColor): string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const FONT_FETCH_ATTEMPTS = 3;
const FONT_FETCH_TIMEOUT_MS = 10_000;
const FONT_RETRY_BASE_DELAY_MS = 500;

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Fetch a font and its body, retrying transient failures with exponential backoff.
 *
 * The body is read inside the attempt because `fetch()` resolves as soon as the
 * headers arrive: a connection truncated mid-download, or the timeout firing on a
 * slow body, has to fail here to be retried at all.
 *
 * Network errors, timeouts, and 5xx responses are retried: a CDN blip should not
 * decide whether a docs build succeeds. A 4xx is a wrong URL, not a blip, so it
 * is reported on the first attempt.
 */
async function fetchFontBuffer(url: string): Promise<ArrayBuffer> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= FONT_FETCH_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS) });
            if (response.ok) return await response.arrayBuffer();
            const statusText = response.statusText ? ` ${response.statusText}` : "";
            lastError = new Error(`HTTP ${response.status}${statusText}`);
            if (response.status < 500) break;
        } catch (error) {
            lastError = error;
        }
        if (attempt < FONT_FETCH_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, FONT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
        }
    }
    throw new Error(`[northwestern-starlight-theme] Failed to fetch OG font from ${url}: ${errorMessage(lastError)}`, {
        cause: lastError,
    });
}

async function readFontFile(path: string): Promise<ArrayBuffer> {
    const file = await fs.readFile(path);
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

/**
 * Cached per URL, failures included. A static build renders one OG image per
 * page, so a font the CDN is down for would otherwise be re-fetched — and
 * re-retried — once per page. The retries above already cover a blip.
 */
const fontCache = new Map<string, Promise<ArrayBuffer>>();

/**
 * Load a font from disk or a remote URL for OG image rendering.
 *
 * @internal
 */
export function loadFont(url: string): Promise<ArrayBuffer> {
    const cached = fontCache.get(url);
    if (cached) return cached;
    const pending = /^https?:\/\//.test(url) ? fetchFontBuffer(url) : readFontFile(url);
    fontCache.set(url, pending);
    return pending;
}

function fontFamilyName(url: string): string {
    return url.includes("Poppins") ? "Poppins" : url.includes("Akkurat") ? "Akkurat Pro" : "Noto Sans";
}

const warnedFontUrls = new Set<string>();

/**
 * Load the fonts satori renders with, dropping any that failed.
 *
 * OG images are a nice-to-have; a font the CDN would not serve degrades the
 * image (satori falls back to a font that did load) instead of failing the
 * consumer's build. Satori needs at least one font, so an empty list still
 * throws.
 *
 * @internal — exposed for unit tests.
 */
export async function loadSatoriFonts(fontUrls: string[]) {
    const settled = await Promise.allSettled(fontUrls.map((url) => loadFont(url)));

    const fonts = settled.flatMap((result, index) => {
        const url = fontUrls[index];
        if (result.status === "fulfilled") {
            return [{ name: fontFamilyName(url), data: result.value, weight: 400 as const }];
        }
        if (!warnedFontUrls.has(url)) {
            warnedFontUrls.add(url);
            console.warn(
                `[northwestern-starlight-theme] OG font unavailable, rendering without it: ${errorMessage(result.reason)}`,
            );
        }
        return [];
    });

    if (fonts.length === 0) {
        throw new Error(
            "[northwestern-starlight-theme] No OG fonts could be loaded, so OG images cannot be rendered. " +
                "Check network access to the configured font URLs.",
        );
    }

    return fonts;
}

const logoCache = new Map<string, string>();

async function loadLogoDataURL(filePath: string): Promise<string> {
    const cached = logoCache.get(filePath);
    if (cached) return cached;
    const buffer = await fs.readFile(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "png";
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    const dataURL = `data:${mime};base64,${buffer.toString("base64")}`;
    logoCache.set(filePath, dataURL);
    return dataURL;
}

export async function renderOGImage({
    resvgWasmPath,
    title,
    description = "",
    bgGradient = [[0, 0, 0]],
    border: borderConfig = {},
    padding: rawPadding = 80,
    logo,
    font: fontConfig = {},
    fonts: fontUrls = ["https://api.fontsource.org/v1/fonts/noto-sans/latin-400-normal.ttf"],
}: OGImageOptions) {
    const decodedTitle = decodeText(title);
    const decodedDescription = description ? decodeText(description) : "";

    const [vPad, hPad] = Array.isArray(rawPadding) ? rawPadding : [rawPadding, rawPadding];
    const borderColor = borderConfig.color ?? [255, 255, 255];
    const borderWidth = borderConfig.width ?? 0;

    const titleFont = {
        families: fontConfig.title?.families ?? ["Noto Sans"],
        size: fontConfig.title?.size ?? 70,
        weight: fontConfig.title?.weight ?? "Normal",
        lineHeight: fontConfig.title?.lineHeight ?? 1,
        color: fontConfig.title?.color ?? ([255, 255, 255] as RGBColor),
    };
    const descFont = {
        families: fontConfig.description?.families ?? ["Noto Sans"],
        size: fontConfig.description?.size ?? 40,
        weight: fontConfig.description?.weight ?? "Normal",
        lineHeight: fontConfig.description?.lineHeight ?? 1.3,
        color: fontConfig.description?.color ?? ([255, 255, 255] as RGBColor),
    };

    const satoriFont = await loadSatoriFonts(fontUrls);

    const logoDataURL = logo ? await loadLogoDataURL(logo.path) : undefined;
    const logoW = logo?.size?.[0] ?? 60;
    const logoH = logo?.size?.[1] ?? logoW;

    const bgStart = rgbToCSS(bgGradient[0]);
    const bgEnd = bgGradient.length > 1 ? rgbToCSS(bgGradient[bgGradient.length - 1]) : bgStart;

    const element = {
        type: "div",
        props: {
            style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                background: `linear-gradient(to bottom, ${bgStart}, ${bgEnd})`,
                padding: `${vPad}px ${hPad}px`,
                paddingLeft: `${hPad + borderWidth}px`,
                borderLeft: borderWidth ? `${borderWidth}px solid ${rgbToCSS(borderColor)}` : undefined,
            },
            children: [
                ...(logoDataURL
                    ? [
                          {
                              type: "img",
                              props: {
                                  src: logoDataURL,
                                  width: logoW,
                                  height: logoH,
                                  style: { marginBottom: "32px" },
                              },
                          },
                      ]
                    : []),
                {
                    type: "div",
                    props: {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            width: "100%",
                        },
                        children: [
                            {
                                type: "div",
                                props: {
                                    style: {
                                        fontFamily: titleFont.families[0],
                                        fontSize: `${titleFont.size}px`,
                                        fontWeight: toFontWeight(titleFont.weight),
                                        lineHeight: titleFont.lineHeight,
                                        color: rgbToCSS(titleFont.color),
                                        whiteSpace: "pre-wrap",
                                        textAlign: "center",
                                    },
                                    children: decodedTitle,
                                },
                            },
                            ...(decodedDescription
                                ? [
                                      {
                                          type: "div",
                                          props: {
                                              style: {
                                                  fontFamily: descFont.families[0],
                                                  fontSize: `${descFont.size}px`,
                                                  fontWeight: toFontWeight(descFont.weight),
                                                  lineHeight: descFont.lineHeight,
                                                  color: rgbToCSS(descFont.color),
                                                  marginTop: "24px",
                                                  textAlign: "center",
                                                  maxWidth: "560px",
                                              },
                                              children: decodedDescription,
                                          },
                                      },
                                  ]
                                : []),
                        ],
                    },
                },
            ],
        },
    };

    const svg = await satori(element as any, {
        width,
        height,
        fonts: satoriFont,
    });
    await ensureWasm(resvgWasmPath);
    const resvg = new Resvg(svg, {
        fitTo: { mode: "width", value: width },
    });

    return Buffer.from(resvg.render().asPng());
}
