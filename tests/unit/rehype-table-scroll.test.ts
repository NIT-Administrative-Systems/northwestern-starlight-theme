import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import rehypeTableScroll from "../../packages/northwestern-starlight-theme/src/rehype-table-scroll.ts";

function makeTable(): Element {
    return {
        type: "element",
        tagName: "table",
        properties: {},
        children: [
            {
                type: "element",
                tagName: "tr",
                properties: {},
                children: [{ type: "element", tagName: "td", properties: {}, children: [] }],
            },
        ],
    };
}

function makeRoot(...children: Element[]): Root {
    return { type: "root", children };
}

function makeParagraph(text = "hello"): Element {
    return {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value: text }],
    };
}

function makeDiv(...children: Element[]): Element {
    return {
        type: "element",
        tagName: "div",
        properties: {},
        children,
    };
}

const transform = rehypeTableScroll();

describe("rehypeTableScroll", () => {
    it("wraps a top-level table in a scrollable container", () => {
        const tree = makeRoot(makeTable());
        transform(tree);

        const wrapper = tree.children[0] as Element;
        expect(wrapper.tagName).toBe("div");
        expect(wrapper.properties.className).toEqual(["nu-table-scroll"]);
        expect((wrapper.children[0] as Element).tagName).toBe("table");
    });

    it("sets accessibility attributes on the wrapper", () => {
        const tree = makeRoot(makeTable());
        transform(tree);

        const wrapper = tree.children[0] as Element;
        expect(wrapper.properties.tabindex).toBe(0);
        expect(wrapper.properties.role).toBe("region");
        expect(wrapper.properties.ariaLabel).toBe("Scrollable table");
    });

    it("wraps a table nested inside a div", () => {
        const tree = makeRoot(makeDiv(makeTable()));
        transform(tree);

        const div = tree.children[0] as Element;
        const wrapper = div.children[0] as Element;
        expect(wrapper.tagName).toBe("div");
        expect(wrapper.properties.className).toEqual(["nu-table-scroll"]);
        expect((wrapper.children[0] as Element).tagName).toBe("table");
    });

    it("wraps multiple sibling tables independently", () => {
        const tree = makeRoot(makeTable(), makeTable());
        transform(tree);

        expect(tree.children).toHaveLength(2);
        for (const child of tree.children) {
            const el = child as Element;
            expect(el.tagName).toBe("div");
            expect(el.properties.className).toEqual(["nu-table-scroll"]);
        }
    });

    it("does not modify a tree without tables", () => {
        const tree = makeRoot(makeParagraph("one"), makeParagraph("two"));
        const before = JSON.stringify(tree);
        transform(tree);
        expect(JSON.stringify(tree)).toBe(before);
    });

    it("does not double-wrap a table already inside a .nu-table-scroll wrapper", () => {
        const existingWrapper: Element = {
            type: "element",
            tagName: "div",
            properties: { className: ["nu-table-scroll"], tabindex: 0, role: "region", ariaLabel: "Scrollable table" },
            children: [makeTable()],
        };
        const tree = makeRoot(existingWrapper);
        transform(tree);

        // The wrapper should still be a single div, not double-wrapped
        const outer = tree.children[0] as Element;
        expect(outer.tagName).toBe("div");
        expect(outer.properties.className).toEqual(["nu-table-scroll"]);
        // The child should still be the table, not another wrapper
        expect((outer.children[0] as Element).tagName).toBe("table");
    });
});
