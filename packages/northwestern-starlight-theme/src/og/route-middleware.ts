import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import type { HeadConfig } from "@astrojs/starlight/schemas/head";

type HeadEntry = HeadConfig[number];

export const onRequest = defineRouteMiddleware((context) => {
    const route = context.locals.starlightRoute;
    const site = context.site;
    if (!site) return;

    const ogPath = route.id ? `/og/${route.id}.png` : "/og/index.png";
    const imageUrl = new URL(ogPath, site).href;

    // Replace Starlight's twitter:card (defaults to "summary" on non-splash
    // pages) with "summary_large_image" so the 1200x630 image isn't cropped.
    const twitterCardIndex = route.head.findIndex(
        (entry: HeadEntry) => entry.tag === "meta" && entry.attrs.name === "twitter:card",
    );
    if (twitterCardIndex !== -1) {
        route.head[twitterCardIndex] = {
            tag: "meta",
            attrs: { name: "twitter:card", content: "summary_large_image" },
        };
    }

    // Resolve the favicon path from Starlight's head tags for og:logo.
    const faviconEntry = route.head.find(
        (entry: HeadEntry) => entry.tag === "link" && entry.attrs.rel === "shortcut icon",
    );
    const faviconHref = faviconEntry?.attrs.href ?? "/favicon.png";
    const logoUrl = new URL(faviconHref, site).href;

    route.head.push(
        { tag: "meta", attrs: { property: "og:image", content: imageUrl } },
        { tag: "meta", attrs: { property: "og:image:type", content: "image/png" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: route.entry.data.title } },
        { tag: "meta", attrs: { property: "og:logo", content: logoUrl } },
        { tag: "meta", attrs: { name: "twitter:image", content: imageUrl } },
        { tag: "meta", attrs: { name: "twitter:image:alt", content: route.entry.data.title } },
    );
});
