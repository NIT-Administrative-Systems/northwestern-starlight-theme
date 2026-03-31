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
        const padding = isChangelogVersion ? 180 : 140;
        return {
            title,
            description: page.data.description,
            logo: { path: logoPath, size: [52] },
            bgGradient: [[64, 31, 104]],
            padding,
            border: {
                color: [164, 149, 195],
                width: 10,
                side: "inline-start",
            },
            font: {
                title: {
                    families: ["Poppins"],
                    weight: "Bold",
                    size: isIndex ? 46 : isChangelogVersion ? 50 : 44,
                    lineHeight: 1.3,
                    color: [255, 255, 255],
                },
                description: {
                    families: ["Akkurat Pro"],
                    size: 24,
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
