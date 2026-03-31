import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";

const docs = await getCollection("docs");
const pages = Object.fromEntries(docs.map((doc) => [doc.id, doc]));

export const { getStaticPaths, GET } = await OGImageRoute({
    param: "slug",
    pages,
    getImageOptions: (_path, page) => ({
        title: page.data.title,
        description: page.data.description,
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
                weight: "SemiBold",
                size: 64,
                lineHeight: 1.2,
                color: [255, 255, 255],
            },
            description: {
                families: ["Akkurat Pro"],
                size: 28,
                lineHeight: 1.4,
                color: [228, 224, 238],
            },
        },
        fonts: [
            "https://common.northwestern.edu/v8/css/fonts/Poppins-Bold.woff",
            "https://common.northwestern.edu/v8/css/fonts/AkkuratProRegular.woff",
        ],
    }),
});
