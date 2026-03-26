/**
 * Shared UI primitives for the Mermaid toolbar and fullscreen viewer.
 *
 * Pure factories and helpers with no DOM querying or lifecycle logic.
 * Everything here is stateless except the success timer and toast tracking,
 * which are scoped to individual button/container instances.
 */

import { diagramSources } from "./render";

// ---------------------------------------------------------------------------
// SVG icon paths (Lucide-compatible, 24x24 viewBox)
// ---------------------------------------------------------------------------

/** SVG path data for toolbar and overlay icons. */
export const ICON_PATHS = {
    fullscreen: ["M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"],
    download: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
    close: ["M18 6L6 18M6 6l12 12"],
    zoomIn: ["M12 5v14", "M5 12h14"],
    zoomOut: ["M5 12h14"],
    reset: ["M3 12a9 9 0 1018 0 9 9 0 00-18 0z", "M12 8v4l2 2"],
    copy: [
        "M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2",
        "M16 4h2a2 2 0 012 2v6a2 2 0 01-2 2h-8a2 2 0 01-2-2V6a2 2 0 012-2",
    ],
    code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
    check: ["M20 6L9 17l-5-5"],
} as const;

const SVG_NS = "http://www.w3.org/2000/svg";

// ---------------------------------------------------------------------------
// Icon and button factories
// ---------------------------------------------------------------------------

/** Create a stroked SVG icon from an array of path `d` attributes. */
export function createIcon(paths: readonly string[], size = 14): SVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    const attrs: Record<string, string | number> = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
    };
    for (const [attr, value] of Object.entries(attrs)) {
        svg.setAttribute(attr, String(value));
    }
    for (const d of paths) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
    }
    return svg;
}

/** Create a zoom-specific icon with a magnifying glass circle + handle. */
function createZoomIcon(innerPaths: readonly string[]): SVGElement {
    const svg = createIcon(innerPaths, 14);
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "8");
    svg.insertBefore(circle, svg.firstChild);
    const handle = document.createElementNS(SVG_NS, "path");
    handle.setAttribute("d", "M21 21l-4.35-4.35");
    svg.insertBefore(handle, svg.children[1]);
    return svg;
}

/** Create an accessible toolbar button with an icon and a `data-action` attribute. */
export function createActionButton(
    label: string,
    action: string,
    iconPaths: readonly string[],
    className = "nu-mermaid-btn",
): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = className;
    button.dataset.action = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.appendChild(createIcon(iconPaths));
    return button;
}

/** Create a zoom-specific button with a magnifying glass icon. */
export function createZoomButton(
    label: string,
    action: string,
    innerPaths: readonly string[],
    className = "nu-mermaid-btn",
): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = className;
    button.dataset.action = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.appendChild(createZoomIcon(innerPaths));
    return button;
}

// ---------------------------------------------------------------------------
// Button success feedback
// ---------------------------------------------------------------------------

const activeSuccessTimers = new WeakMap<HTMLButtonElement, number>();

/**
 * Temporarily replace a button's icon with a checkmark and apply the success style.
 *
 * Debounced per button — rapid clicks clear the previous timer and restart.
 * The original icon and title restore after 1500ms.
 */
export function flashSuccess(button: HTMLButtonElement, label = "Copied!"): void {
    const previousTimer = activeSuccessTimers.get(button);
    if (previousTimer) {
        clearTimeout(previousTimer);
        button.querySelector(".nu-mermaid-check")?.remove();
    }

    const originalTitle = button.title;
    const originalIcon = button.querySelector("svg:not(.nu-mermaid-check)");
    const checkIcon = createIcon(ICON_PATHS.check, 14);
    checkIcon.classList.add("nu-mermaid-check");

    button.title = label;
    button.classList.add("nu-mermaid-success");
    if (originalIcon) {
        (originalIcon as HTMLElement).style.display = "none";
        button.insertBefore(checkIcon, button.firstChild);
    }

    const timer = window.setTimeout(() => {
        activeSuccessTimers.delete(button);
        button.title = originalTitle;
        button.classList.remove("nu-mermaid-success");
        checkIcon.remove();
        if (originalIcon) (originalIcon as HTMLElement).style.display = "";
    }, 1500);
    activeSuccessTimers.set(button, timer);
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

let currentToast: HTMLElement | null = null;
let currentToastTimer = 0;

/** Display a toast message in the bottom-right of a container. Replaces any active toast. */
export function showToast(container: HTMLElement, message: string): void {
    if (currentToast) {
        clearTimeout(currentToastTimer);
        currentToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = "nu-mermaid-toast";
    toast.textContent = message;
    container.appendChild(toast);
    currentToast = toast;

    requestAnimationFrame(() => toast.classList.add("nu-mermaid-toast-visible"));

    currentToastTimer = window.setTimeout(() => {
        toast.classList.remove("nu-mermaid-toast-visible");
        setTimeout(() => {
            toast.remove();
            if (currentToast === toast) currentToast = null;
        }, 200);
    }, 2000);
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

/**
 * Copy text to the clipboard with a visual success flash on the button.
 *
 * Uses the Clipboard API when available (HTTPS / localhost). Falls back to
 * `document.execCommand("copy")` via a hidden textarea for insecure contexts
 * (e.g., HTTP over LAN). The textarea is appended inside the closest overlay
 * to prevent iOS Safari's URL bar from toggling.
 */
export async function writeToClipboard(text: string, triggerButton: HTMLButtonElement): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        flashSuccess(triggerButton, "Copied!");
    } catch {
        const host = triggerButton.closest(".nu-mermaid-overlay") ?? document.body;
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.cssText = "position:absolute;left:-9999px;opacity:0;height:0";
        host.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        textarea.remove();
        if (success) flashSuccess(triggerButton, "Copied!");
    }
}

// ---------------------------------------------------------------------------
// SVG download
// ---------------------------------------------------------------------------

/**
 * Download the diagram SVG with a descriptive filename derived from
 * the site title, page slug, and diagram type.
 */
export function downloadDiagramSvg(svg: SVGElement, container: Element): void {
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", SVG_NS);
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadFilename(container);
    anchor.click();
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Filename generation (private)
// ---------------------------------------------------------------------------

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function extractSiteSlug(): string {
    const segments = document.title.split("|");
    return slugify((segments.length > 1 ? segments.at(-1)! : segments[0]).trim());
}

function extractPageSlug(): string {
    return slugify(window.location.pathname.replace(/^\/|\/$/g, "")) || "index";
}

function detectDiagramType(container: Element): string {
    const source = diagramSources.get(container) ?? "";
    const keyword = source.trim().split(/[\s\n]/)[0];
    return slugify(keyword.replace(/[-_](v\d+|beta)$/i, "").replace(/(diagram|chart)$/i, "")) || "diagram";
}

function buildDownloadFilename(container: Element): string {
    const site = extractSiteSlug();
    const page = extractPageSlug();
    const type = detectDiagramType(container);

    const allDiagrams = [...document.querySelectorAll<HTMLElement>(".mermaid:not(.nu-mermaid-fullscreen)")];
    const sameType = allDiagrams.filter((d) => detectDiagramType(d) === type);
    const disambiguator = sameType.length > 1 ? `-${sameType.indexOf(container as HTMLElement) + 1}` : "";

    return `${site}_${page}-${type}${disambiguator}.svg`;
}
