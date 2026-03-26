/**
 * Diagram source registry, Mermaid runtime adapter, and viewport-aware render scheduler.
 *
 * Captures raw diagram definitions before `astro-mermaid` replaces them with SVG,
 * lazily renders diagrams as they enter the viewport, and re-renders on theme changes.
 */

/** Active theme mode derived from the `data-theme` attribute on `<html>`. */
export type ThemeMode = "light" | "dark";

type MermaidRuntime = typeof import("mermaid")["default"];

const DIAGRAM_SELECTOR = "pre.mermaid:not(.nu-mermaid-fullscreen)";
const PRERENDER_MARGIN = "200px";

/** Registry mapping diagram containers to their raw Mermaid source text. */
export const diagramSources = new Map<Element, string>();

/** Tracks which theme each diagram was last rendered with to avoid redundant re-renders. */
const renderedThemes = new WeakMap<HTMLElement, ThemeMode>();

let runtimePromise: Promise<MermaidRuntime> | undefined;

/** Resolve the active theme from the document's `data-theme` attribute. */
export function resolveThemeMode(): ThemeMode {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Lazy-load the Mermaid runtime. Cached after first import. */
async function loadRuntime(): Promise<MermaidRuntime> {
    runtimePromise ??= import("mermaid").then((m) => m.default);
    return runtimePromise;
}

/** Read the Northwestern Mermaid config injected by the theme integration for the given mode. */
function themeConfig(mode: ThemeMode): Record<string, unknown> {
    return window.__NU_MERMAID_CONFIGS__?.[mode] ?? {};
}

/**
 * Walk the DOM and capture raw source text from all `pre.mermaid` elements.
 *
 * Prefers the `data-diagram` attribute (set by `astro-mermaid` before it renders SVG)
 * over `textContent`, which may contain concatenated SVG text nodes after rendering.
 * Persists source back to `data-diagram` so it survives across render cycles and
 * Astro view transitions.
 */
export function captureDiagramSources(): void {
    for (const element of document.querySelectorAll<HTMLElement>("pre.mermaid")) {
        if (diagramSources.has(element)) continue;

        const source = element.getAttribute("data-diagram")?.trim() || element.textContent?.trim() || "";
        if (!source) continue;

        diagramSources.set(element, source);
        if (!element.hasAttribute("data-diagram")) {
            element.setAttribute("data-diagram", source);
        }
    }
}

/**
 * Render a single diagram container with the given theme.
 *
 * Initializes the Mermaid runtime with the Northwestern theme config,
 * generates SVG, and injects it into the container.
 */
async function renderDiagram(container: HTMLElement, mode: ThemeMode, index: number): Promise<void> {
    const source =
        diagramSources.get(container) ??
        container.getAttribute("data-diagram")?.trim() ??
        container.textContent?.trim();
    if (!source) return;

    const mermaid = await loadRuntime();
    mermaid.initialize({ startOnLoad: false, ...(themeConfig(mode) as Record<string, unknown>) });

    const renderId = `nu-mermaid-${mode}-${index}-${Math.random().toString(36).slice(2, 8)}`;
    // mermaid.render returns sanitized SVG from trusted diagram source (user-authored markdown)
    const { svg, bindFunctions } = await mermaid.render(renderId, source);
    container.innerHTML = svg;
    bindFunctions?.(container);
    renderedThemes.set(container, mode);
}

/** Check whether a container needs rendering for the given mode. */
function needsRender(container: HTMLElement, mode: ThemeMode): boolean {
    return renderedThemes.get(container) !== mode || !container.querySelector("svg");
}

/**
 * Render all mermaid diagrams on the page.
 *
 * @param forceAll - When `true` (e.g., theme change), re-renders every diagram immediately.
 *   When `false` (default), uses an IntersectionObserver to lazily render diagrams
 *   as they scroll within {@link PRERENDER_MARGIN} of the viewport.
 */
export async function renderAllDiagrams(forceAll = false): Promise<void> {
    captureDiagramSources();
    const mode = resolveThemeMode();
    const containers = [...document.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR)];
    if (!containers.length) return;

    if (forceAll) {
        for (const [index, container] of containers.entries()) {
            if (needsRender(container, mode)) {
                await renderDiagram(container, mode, index);
            }
        }
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const container = entry.target as HTMLElement;
                const currentMode = resolveThemeMode();
                if (!needsRender(container, currentMode)) continue;
                observer.unobserve(container);
                void renderDiagram(container, currentMode, containers.indexOf(container));
            }
        },
        { rootMargin: PRERENDER_MARGIN },
    );

    for (const container of containers) {
        if (needsRender(container, mode)) {
            observer.observe(container);
        }
    }
}
