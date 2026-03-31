import { getCollection } from "astro:content";
import config from "virtual:northwestern-theme/config";
import { renderOGImage } from "./render";

const siteTitle = config.ogImage.siteTitle;
const logoPath = config.ogImage.logoPath;
const resvgWasmPath = config.ogImage.resvgWasmPath;
const docs = await getCollection("docs");
let changelogs: typeof docs = [];
try {
    changelogs = await getCollection("changelogs" as "docs");
} catch {}
const pages = Object.fromEntries([...docs, ...changelogs].map((entry) => [entry.id, entry]));

function getImageOptions(path: string, page: (typeof docs)[number]) {
    const isIndex = path === "index";
    const isChangelogVersion = path.startsWith("changelog/version/");
    const title = isIndex ? siteTitle : isChangelogVersion ? `Changelog\n${page.data.title}` : page.data.title;
    return {
        resvgWasmPath,
        title,
        description: page.data.description,
        logo: { path: logoPath, size: [60] as [number] },
        bgGradient: [[64, 31, 104]] as [number, number, number][],
        padding: 120,
        border: {
            color: [164, 149, 195] as [number, number, number],
            width: 12,
        },
        font: {
            title: {
                families: ["Poppins"],
                weight: "Bold" as const,
                size: isChangelogVersion ? 56 : 48,
                lineHeight: 1.3,
                color: [255, 255, 255] as [number, number, number],
            },
            description: {
                families: ["Akkurat Pro"],
                size: 28,
                lineHeight: 1.5,
                color: [182, 172, 209] as [number, number, number],
            },
        },
        fonts: [
            "https://common.northwestern.edu/v8/css/fonts/Poppins-Bold.woff",
            "https://common.northwestern.edu/v8/css/fonts/AkkuratProRegular.woff",
        ],
    };
}

export function getStaticPaths() {
    return Object.entries(pages).map(([pagePath, page]) => ({
        params: { slug: `${pagePath}.png` },
        props: { imageOptions: getImageOptions(pagePath, page) },
    }));
}

export async function GET({ props }: { props: { imageOptions: ReturnType<typeof getImageOptions> } }) {
    return new Response(await renderOGImage(props.imageOptions), {
        headers: { "Content-Type": "image/png" },
    });
}
