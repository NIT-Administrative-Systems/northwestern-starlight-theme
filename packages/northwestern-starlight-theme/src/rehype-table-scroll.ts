/**
 * Rehype plugin that wraps `<table>` elements in a scrollable container at build time.
 *
 * Inserts a `<div class="nu-table-scroll">` around each table with `tabindex="0"`,
 * `role="region"`, and `aria-label` for keyboard scrollability. Runs during the
 * Astro build so the HTML arrives with the wrapper already in place.
 */
import type { Element, Nodes, Root } from "hast";

function isScrollWrapper(node: Element): boolean {
    const classes = node.properties?.className;
    return Array.isArray(classes) && classes.includes("nu-table-scroll");
}

function walk(node: Nodes) {
    if (!("children" in node)) return;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "element" && (child as Element).tagName === "table") {
            const wrapper: Element = {
                type: "element",
                tagName: "div",
                properties: {
                    className: ["nu-table-scroll"],
                    tabindex: 0,
                    role: "region",
                    ariaLabel: "Scrollable table",
                },
                children: [child as Element],
            };
            node.children[i] = wrapper;
        } else if (child.type === "element" && isScrollWrapper(child as Element)) {
            // Already wrapped — skip to avoid double-wrapping
        } else {
            walk(child as Nodes);
        }
    }
}

export default function rehypeTableScroll() {
    return (tree: Root) => walk(tree);
}
