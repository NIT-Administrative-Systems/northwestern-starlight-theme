import { getCollection } from "astro:content";
import config from "virtual:northwestern-theme/config";
import { OGImageRoute } from "astro-og-canvas";

const siteTitle = config.ogImage.siteTitle;
const logoPath = config.ogImage.logoPath;
const docs = await getCollection("docs");
let changelogs: typeof docs = [];
try {
    changelogs = await getCollection("changelogs" as "docs");
} catch {}
const pages = Object.fromEntries([...docs, ...changelogs].map((entry) => [entry.id, entry]));

export const { getStaticPaths, GET } = await OGImageRoute({
    param: "slug",
    pages,
    getImageOptions: (path, page) => {
        const isIndex = path === "index";
        const isChangelogVersion = path.startsWith("changelog/version/");
        const title = isIndex ? siteTitle : isChangelogVersion ? `Changelog\n${page.data.title}` : page.data.title;
        return {
            title,
            description: page.data.description,
            logo: { path: logoPath, size: [60] },
            bgGradient: [[64, 31, 104]],
            padding: 80,
            border: {
                color: [164, 149, 195],
                width: 12,
                side: "inline-start",
            },
            font: {
                title: {
                    families: ["Poppins"],
                    weight: "Bold",
                    size: isChangelogVersion ? 56 : 48,
                    lineHeight: 1.3,
                    color: [255, 255, 255],
                },
                description: {
                    families: ["Akkurat Pro"],
                    size: 28,
                    lineHeight: 1.5,
                    color: [182, 172, 209],
                },
            },
            fonts: [
                "https://common.northwestern.edu/v8/css/fonts/Poppins-Bold.woff",
                "https://common.northwestern.edu/v8/css/fonts/AkkuratProRegular.woff",
            ],
        };
    },
});
