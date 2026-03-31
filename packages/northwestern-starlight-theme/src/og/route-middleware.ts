import { getEntry } from "astro:content";
import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import type { HeadConfig } from "@astrojs/starlight/schemas/head";

type HeadEntry = HeadConfig[number];
type JsonLd = Record<string, unknown>;

/** Strip Markdown syntax to produce plain text for meta descriptions. */
function markdownToPlainText(md: string): string {
    return (
        md
            // Remove headings
            .replace(/^#{1,6}\s+/gm, "")
            // Remove list markers before bold so `- **text**` works
            .replace(/^[\s]*[-*+]\s+/gm, "")
            // Remove bold/italic
            .replace(/\*{1,3}(.+?)\*{1,3}/g, "$1")
            .replace(/_{1,3}(.+?)_{1,3}/g, "$1")
            // Remove inline code
            .replace(/`(.+?)`/g, "$1")
            // Remove links, keep text
            .replace(/\[(.+?)\]\(.+?\)/g, "$1")
            // Remove images
            .replace(/!\[.*?\]\(.+?\)/g, "")
            // Collapse whitespace
            .replace(/\n+/g, " ")
            .trim()
    );
}

function getStructuredData({
    imageUrl,
    isHomepage,
    isChangelogVersion,
    logoUrl,
    pageUrl,
    siteName,
    title,
    description,
}: {
    imageUrl: string;
    isHomepage: boolean;
    isChangelogVersion: boolean;
    logoUrl: string;
    pageUrl: string;
    siteName: string;
    title: string;
    description?: string;
}): JsonLd {
    const origin = new URL(pageUrl).origin;
    const organization = {
        "@id": `${origin}/#organization`,
        "@type": "Organization",
        name: "Northwestern University",
        url: "https://www.northwestern.edu",
        logo: logoUrl,
    };
    const website = {
        "@id": `${origin}/#website`,
        "@type": "WebSite",
        name: siteName,
        url: `${origin}/`,
        description,
        image: imageUrl,
        publisher: { "@id": organization["@id"] },
    };

    if (isHomepage) {
        return {
            "@context": "https://schema.org",
            "@graph": [organization, website],
        };
    }

    return {
        "@context": "https://schema.org",
        "@graph": [
            organization,
            website,
            {
                "@type": isChangelogVersion ? "Article" : "TechArticle",
                headline: title,
                name: title,
                description,
                image: imageUrl,
                url: pageUrl,
                mainEntityOfPage: pageUrl,
                isPartOf: { "@id": website["@id"] },
                publisher: { "@id": organization["@id"] },
            },
        ],
    };
}

export const onRequest = defineRouteMiddleware(async (context) => {
    const route = context.locals.starlightRoute;
    const site = context.site;
    if (!site) return;

    const pageUrl = new URL(context.url.pathname, site).href;
    const siteName = route.siteTitle ?? route.entry.data.title;
    const isHomepage = route.id === "index" || context.url.pathname === "/";
    const isChangelogVersion = route.id?.startsWith("changelog/version/") ?? false;
    const ogPath = route.id ? `/og/${route.id}.png` : "/og/index.png";
    const imageUrl = new URL(ogPath, site).href;

    // For changelog version pages, derive og:description from the Markdown body
    // when no explicit description is set in frontmatter.
    if (isChangelogVersion && !route.entry.data.description) {
        const changelogEntry = await getEntry("changelogs" as "docs", route.id);
        const body = changelogEntry?.body;
        if (body) {
            const plainText = markdownToPlainText(body);
            if (plainText) {
                route.head.push({
                    tag: "meta",
                    attrs: { property: "og:description", content: plainText },
                });
            }
        }
    }

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
    const structuredData = JSON.stringify(
        getStructuredData({
            imageUrl,
            isHomepage,
            isChangelogVersion,
            logoUrl,
            pageUrl,
            siteName,
            title: route.entry.data.title,
            description: route.entry.data.description,
        }),
    );

    route.head.push(
        { tag: "meta", attrs: { property: "og:image", content: imageUrl } },
        { tag: "meta", attrs: { property: "og:image:type", content: "image/png" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: route.entry.data.title } },
        { tag: "meta", attrs: { property: "og:logo", content: logoUrl } },
        { tag: "meta", attrs: { name: "twitter:image", content: imageUrl } },
        { tag: "meta", attrs: { name: "twitter:image:alt", content: route.entry.data.title } },
        { tag: "script", attrs: { type: "application/ld+json" }, content: structuredData },
    );
});
