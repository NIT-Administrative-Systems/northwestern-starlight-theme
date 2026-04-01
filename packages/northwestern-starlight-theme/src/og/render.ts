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

function decodeText(text: string) {
    return text
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'");
}

function rgbToCSS(rgb: RGBColor): string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const fontCache = new Map<string, ArrayBuffer>();

async function loadFont(url: string): Promise<ArrayBuffer> {
    const cached = fontCache.get(url);
    if (cached) return cached;
    let buffer: ArrayBuffer;
    if (/^https?:\/\//.test(url)) {
        const response = await fetch(url);
        buffer = await response.arrayBuffer();
    } else {
        const file = await fs.readFile(url);
        buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    }
    fontCache.set(url, buffer);
    return buffer;
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

    const fontData = await Promise.all(fontUrls.map(loadFont));
    const satoriFont = fontUrls.map((url, i) => {
        const name = url.includes("Poppins") ? "Poppins" : url.includes("Akkurat") ? "Akkurat Pro" : "Noto Sans";
        return { name, data: fontData[i], weight: 400 as const };
    });

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
