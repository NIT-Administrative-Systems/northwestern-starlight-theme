/**
 * Mermaid Toolbar — Fullscreen viewer with pan/zoom, download, and copy.
 *
 * Features:
 *   - Hover toolbar: fullscreen, download SVG, copy mermaid source
 *   - Fullscreen overlay: pan/zoom, download, copy, zoom indicator, diagram title
 *   - Keyboard: +/- zoom, 0 reset, arrows pan, Escape close
 *   - Double-click to zoom in
 *   - Smooth open/close animation
 */

// Force module scope so `declare global` works correctly
export {};

declare global {
    interface Window {
        __NU_MERMAID_TOOLBAR__?: boolean;
        __NU_MERMAID_CONFIGS__?: {
            light?: Record<string, unknown>;
            dark?: Record<string, unknown>;
        };
    }
}

// ---- Icon paths ----
const ICONS = {
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
    fitWidth: ["M21 3H3v18h18V3z", "M9 3v18", "M15 3v18"],
    fitHeight: ["M21 3H3v18h18V3z", "M3 9h18", "M3 15h18"],
};

function createSvgIcon(paths: string[], size = 14): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    for (const d of paths) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
    }
    return svg;
}

function createButton(title: string, action: string, iconPaths: string[], cls = "nu-mermaid-btn"): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = cls;
    btn.dataset.action = action;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.appendChild(createSvgIcon(iconPaths));
    return btn;
}

function createZoomIcon(extra: string[]): SVGElement {
    const svg = createSvgIcon(extra, 14);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "8");
    svg.insertBefore(circle, svg.firstChild);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", "M21 21l-4.35-4.35");
    svg.insertBefore(line, svg.children[1]);
    return svg;
}

function createZoomButton(
    title: string,
    action: string,
    iconExtra: string[],
    cls = "nu-mermaid-btn",
): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = cls;
    btn.dataset.action = action;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.appendChild(createZoomIcon(iconExtra));
    return btn;
}

type MermaidThemeMode = "light" | "dark";

// ---- Store original mermaid source before rendering ----
const mermaidSources = new Map<Element, string>();
const renderedThemes = new WeakMap<HTMLElement, MermaidThemeMode>();
let mermaidRuntimePromise: Promise<typeof import("mermaid")["default"]> | undefined;

function currentThemeMode(): MermaidThemeMode {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getRuntimeMermaidConfig(mode: MermaidThemeMode): Record<string, unknown> {
    return window.__NU_MERMAID_CONFIGS__?.[mode] ?? {};
}

async function getMermaidRuntime() {
    mermaidRuntimePromise ??= import("mermaid").then((module) => module.default);
    return mermaidRuntimePromise;
}

function captureSource() {
    document.querySelectorAll<HTMLElement>("pre.mermaid").forEach((pre) => {
        if (mermaidSources.has(pre)) return;
        const source = pre.textContent?.trim() || "";
        if (source) mermaidSources.set(pre, source);
    });
}

async function renderDiagram(container: HTMLElement, mode: MermaidThemeMode, index: number) {
    const source = mermaidSources.get(container) ?? container.textContent?.trim();
    if (!source) return;
    const mermaid = await getMermaidRuntime();

    mermaid.initialize({
        startOnLoad: false,
        ...(getRuntimeMermaidConfig(mode) as Record<string, unknown>),
    });

    const renderId = `nu-mermaid-${mode}-${index}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg, bindFunctions } = await mermaid.render(renderId, source);
    container.innerHTML = svg;
    bindFunctions?.(container);
    renderedThemes.set(container, mode);
}

async function renderMermaidDiagrams(force = false) {
    captureSource();
    const mode = currentThemeMode();
    const diagrams = [...document.querySelectorAll<HTMLElement>("pre.mermaid:not(.nu-mermaid-fullscreen)")];
    if (!diagrams.length) return;

    // If force (theme change), re-render all visible diagrams immediately
    if (force) {
        for (const [index, container] of diagrams.entries()) {
            if (renderedThemes.get(container) === mode && container.querySelector("svg")) continue;
            await renderDiagram(container, mode, index);
        }
        return;
    }

    // Lazy render: only render diagrams when they scroll into view
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const container = entry.target as HTMLElement;
                const index = diagrams.indexOf(container);
                if (renderedThemes.get(container) === mode && container.querySelector("svg")) continue;
                observer.unobserve(container);
                void renderDiagram(container, mode, index);
            }
        },
        { rootMargin: "200px" },
    );

    for (const container of diagrams) {
        if (renderedThemes.get(container) === mode && container.querySelector("svg")) continue;
        observer.observe(container);
    }
}

// ---- Success feedback (green check) ----
function showSuccess(btn: HTMLButtonElement, label = "Copied!") {
    const originalTitle = btn.title;
    const originalIcon = btn.querySelector("svg");
    const check = createSvgIcon(["M20 6L9 17l-5-5"], 14);

    btn.title = label;
    btn.classList.add("nu-mermaid-success");
    if (originalIcon) {
        originalIcon.style.display = "none";
        btn.insertBefore(check, btn.firstChild);
    }

    setTimeout(() => {
        btn.title = originalTitle;
        btn.classList.remove("nu-mermaid-success");
        check.remove();
        if (originalIcon) originalIcon.style.display = "";
    }, 1500);
}

// ---- Clipboard helper ----
async function copyToClipboard(text: string, btn: HTMLButtonElement) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess(btn, "Copied!");
    } catch {
        // Fallback
    }
}

// ---- Inline toolbar injection ----
function initMermaidToolbar(): number {
    const diagrams = document.querySelectorAll<HTMLElement>(".mermaid");
    if (!diagrams.length) return 0;
    let injected = 0;

    diagrams.forEach((container, index) => {
        if (container.classList.contains("nu-mermaid-fullscreen")) return;
        if (!container.querySelector("svg")) return;
        if (container.querySelector(".nu-mermaid-toolbar")) return;

        const toolbar = document.createElement("div");
        toolbar.className = "nu-mermaid-toolbar";

        toolbar.appendChild(createButton("Fullscreen", "fullscreen", ICONS.fullscreen));
        toolbar.appendChild(createButton("Download SVG", "download-svg", ICONS.download));

        const source = mermaidSources.get(container);
        if (source) {
            toolbar.appendChild(createButton("Copy Mermaid", "copy-source", ICONS.code));
        }

        container.style.position = "relative";
        container.appendChild(toolbar);
        injected++;

        toolbar.addEventListener("click", (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".nu-mermaid-btn");
            if (!btn) return;
            e.stopPropagation();

            const svg = container.querySelector("svg");
            if (!svg) return;

            const action = btn.dataset.action;
            if (action === "fullscreen") openFullscreen(svg, container, index);
            else if (action === "download-svg") {
                downloadSvg(svg, index);
                showSuccess(btn, "Downloaded!");
            } else if (action === "copy-source" && source) copyToClipboard(source, btn);
        });
    });
    return injected;
}

// ---- Fullscreen overlay ----
function openFullscreen(svg: SVGElement, container: HTMLElement, index: number) {
    const overlay = document.createElement("div");
    overlay.className = "nu-mermaid-overlay";

    // Controls
    const controls = document.createElement("div");
    controls.className = "nu-mermaid-overlay-controls";

    const btnCls = "nu-mermaid-btn nu-mermaid-overlay-btn";
    controls.appendChild(createZoomButton("Zoom In (+)", "zoom-in", ICONS.zoomIn, btnCls));
    controls.appendChild(createZoomButton("Zoom Out (-)", "zoom-out", ICONS.zoomOut, btnCls));
    controls.appendChild(createButton("Reset (0)", "zoom-reset", ICONS.reset, btnCls));

    const sep1 = document.createElement("span");
    sep1.className = "nu-mermaid-separator";
    controls.appendChild(sep1);

    controls.appendChild(createButton("Download SVG", "download-svg", ICONS.download, btnCls));
    controls.appendChild(createButton("Copy SVG", "copy-svg", ICONS.copy, btnCls));

    const source = mermaidSources.get(container);
    if (source) {
        controls.appendChild(createButton("Copy Mermaid", "copy-source", ICONS.code, btnCls));
    }

    // Spacer pushes close button to the right
    const spacer = document.createElement("span");
    spacer.className = "nu-mermaid-spacer";
    controls.appendChild(spacer);

    controls.appendChild(createButton("Close (Esc)", "close", ICONS.close, `${btnCls} nu-mermaid-close`));

    overlay.appendChild(controls);

    // Viewport
    const viewport = document.createElement("div");
    viewport.className = "nu-mermaid-viewport";

    const wrapper = document.createElement("div");
    wrapper.className = "mermaid nu-mermaid-fullscreen";

    const cloned = svg.cloneNode(true) as SVGElement;
    cloned.removeAttribute("style");

    // Calculate initial fit
    const viewBox = svg.getAttribute("viewBox");
    let vbWidth = 800;
    let vbHeight = 600;
    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        vbWidth = parts[2] || 800;
        vbHeight = parts[3] || 600;
    }

    function calcFitScale(mode: "both" | "width" | "height" = "both"): number {
        const maxW = window.innerWidth * 0.92;
        const maxH = (window.innerHeight - 120) * 0.92; // account for title + controls
        if (mode === "width") return maxW / vbWidth;
        if (mode === "height") return maxH / vbHeight;
        return Math.min(maxW / vbWidth, maxH / vbHeight);
    }

    const initialScale = calcFitScale();
    cloned.setAttribute("width", String(Math.round(vbWidth * initialScale)));
    cloned.setAttribute("height", String(Math.round(vbHeight * initialScale)));

    wrapper.appendChild(cloned);
    viewport.appendChild(wrapper);
    overlay.appendChild(viewport);

    // Add to DOM with animation
    overlay.style.opacity = "0";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
    });

    // Pan + zoom state
    let scale = 1; // relative to initial fit
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        wrapper.style.transformOrigin = "center center";
    }

    function zoomTo(newScale: number) {
        scale = Math.min(Math.max(0.1, newScale), 20);
        updateTransform();
    }

    function resetView() {
        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
    }

    // Mouse wheel zoom
    viewport.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            zoomTo(scale * delta);
        },
        { passive: false },
    );

    // Pan with mouse drag
    viewport.addEventListener("mousedown", (e) => {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewport.style.cursor = "grabbing";
        e.preventDefault();
    });

    const onMouseMove = (e: MouseEvent) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    };

    const onMouseUp = () => {
        isPanning = false;
        viewport.style.cursor = "grab";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Double-click to zoom in
    viewport.addEventListener("dblclick", (e) => {
        e.preventDefault();
        zoomTo(scale * 1.5);
    });

    // Control buttons
    controls.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".nu-mermaid-overlay-btn");
        if (!btn) return;

        const action = btn.dataset.action;
        if (action === "close") close();
        else if (action === "zoom-in") zoomTo(scale * 1.3);
        else if (action === "zoom-out") zoomTo(scale * 0.7);
        else if (action === "zoom-reset") resetView();
        else if (action === "download-svg") {
            downloadSvg(svg, index);
            showSuccess(btn, "Downloaded!");
        } else if (action === "copy-svg") copyToClipboard(svg.outerHTML, btn);
        else if (action === "copy-source" && source) copyToClipboard(source, btn);
    });

    // Keyboard shortcuts
    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
        else if (e.key === "+" || e.key === "=") zoomTo(scale * 1.2);
        else if (e.key === "-" || e.key === "_") zoomTo(scale * 0.8);
        else if (e.key === "0") resetView();
        else if (e.key === "ArrowUp") {
            panY += 50;
            updateTransform();
        } else if (e.key === "ArrowDown") {
            panY -= 50;
            updateTransform();
        } else if (e.key === "ArrowLeft") {
            panX += 50;
            updateTransform();
        } else if (e.key === "ArrowRight") {
            panX -= 50;
            updateTransform();
        } else return;
        e.preventDefault();
    };
    window.addEventListener("keydown", onKeydown);

    // Close only on overlay backdrop click (not viewport/svg)
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    function close() {
        overlay.style.opacity = "0";
        setTimeout(() => {
            window.removeEventListener("keydown", onKeydown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            document.body.style.overflow = "";
            overlay.remove();
        }, 150);
    }
}

// ---- Download SVG ----
function downloadSvg(svg: SVGElement, index: number) {
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${index + 1}.svg`;
    a.click();
    URL.revokeObjectURL(url);
}

// ---- Watch for mermaid renders ----
function watchForMermaidRender() {
    const toolbarEnabled = window.__NU_MERMAID_TOOLBAR__ !== false;
    // Initial load: lazy render (only diagrams in/near viewport)
    void renderMermaidDiagrams(false).then(() => {
        if (toolbarEnabled) initMermaidToolbar();

        // Re-check for toolbars as lazy diagrams render
        const toolbarObserver = new MutationObserver(() => {
            if (toolbarEnabled) initMermaidToolbar();
        });
        toolbarObserver.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => toolbarObserver.disconnect(), 30000);
    });
}

const themeObserver = new MutationObserver(() => {
    void renderMermaidDiagrams(true).then(() => {
        if (window.__NU_MERMAID_TOOLBAR__ !== false) initMermaidToolbar();
    });
});

themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchForMermaidRender);
} else {
    watchForMermaidRender();
}

document.addEventListener("astro:page-load", watchForMermaidRender);
