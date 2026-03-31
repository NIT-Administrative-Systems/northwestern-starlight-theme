import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

export const onRequest = defineRouteMiddleware((context) => {
    const route = context.locals.starlightRoute;
    const site = context.site;
    if (!site) return;

    const ogPath = route.id ? `/og/${route.id}.png` : "/og/index.png";
    const imageUrl = new URL(ogPath, site).href;

    route.head.push(
        { tag: "meta", attrs: { property: "og:image", content: imageUrl } },
        { tag: "meta", attrs: { property: "og:image:type", content: "image/png" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: route.entry.data.title } },
        { tag: "meta", attrs: { name: "twitter:image", content: imageUrl } },
        { tag: "meta", attrs: { name: "twitter:image:alt", content: route.entry.data.title } },
    );
});
