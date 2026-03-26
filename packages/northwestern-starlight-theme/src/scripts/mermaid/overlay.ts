/**
 * DOM construction for the fullscreen Mermaid viewer.
 *
 * Builds the complete overlay element tree: dialog shell, controls bar with
 * zoom/download/copy/close buttons, scrollable viewport, diagram wrapper,
 * and zoom percentage badge. Returns typed element references for the coordinator.
 */

import { diagramSources } from "./render";
import { createActionButton, createZoomButton, ICON_PATHS } from "./ui";

/** Element references returned by {@link buildOverlay} for the coordinator to wire up. */
export interface OverlayElements {
    /** Root dialog element covering the full viewport. */
    overlay: HTMLDivElement;
    /** Top controls bar containing zoom, download, copy, and close buttons. */
    controls: HTMLDivElement;
    /** Scrollable/pannable area containing the diagram. */
    viewport: HTMLDivElement;
    /** Inner wrapper around the cloned SVG (receives pan/zoom transforms). */
    wrapper: HTMLDivElement;
    /** Zoom percentage indicator in the viewport corner. */
    zoomBadge: HTMLSpanElement;
    /** Raw Mermaid source text if available (for "Copy Mermaid" action). */
    diagramSource: string | undefined;
}

const CONTROLS_BAR_HEIGHT_PX = 120;
const VIEWPORT_FILL_RATIO = 0.92;

/**
 * Build the complete overlay DOM tree for a given diagram.
 *
 * The SVG is cloned and scaled to fit the viewport at 92% fill. The original
 * diagram element is not modified.
 */
export function buildOverlay(sourceSvg: SVGElement, diagramContainer: HTMLElement): OverlayElements {
    const overlay = document.createElement("div");
    overlay.className = "nu-mermaid-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Mermaid diagram fullscreen viewer");

    const controls = buildControlsBar(diagramContainer);
    overlay.appendChild(controls.element);

    const { viewport, wrapper, zoomBadge } = buildViewport(sourceSvg);
    overlay.appendChild(viewport);

    return {
        overlay,
        controls: controls.element,
        viewport,
        wrapper,
        zoomBadge,
        diagramSource: controls.diagramSource,
    };
}

const OVERLAY_BTN_CLASS = "nu-mermaid-btn nu-mermaid-overlay-btn";

function buildControlsBar(diagramContainer: HTMLElement) {
    const bar = document.createElement("div");
    bar.className = "nu-mermaid-overlay-controls";

    bar.appendChild(createZoomButton("Zoom In (+)", "zoom-in", ICON_PATHS.zoomIn, OVERLAY_BTN_CLASS));
    bar.appendChild(createZoomButton("Zoom Out (-)", "zoom-out", ICON_PATHS.zoomOut, OVERLAY_BTN_CLASS));
    bar.appendChild(createActionButton("Reset (0)", "zoom-reset", ICON_PATHS.reset, OVERLAY_BTN_CLASS));

    const separator = document.createElement("span");
    separator.className = "nu-mermaid-separator";
    bar.appendChild(separator);

    bar.appendChild(createActionButton("Download SVG", "download-svg", ICON_PATHS.download, OVERLAY_BTN_CLASS));
    bar.appendChild(createActionButton("Copy SVG", "copy-svg", ICON_PATHS.copy, OVERLAY_BTN_CLASS));

    const diagramSource = diagramSources.get(diagramContainer);
    if (diagramSource) {
        bar.appendChild(createActionButton("Copy Mermaid", "copy-source", ICON_PATHS.code, OVERLAY_BTN_CLASS));
    }

    const spacer = document.createElement("span");
    spacer.className = "nu-mermaid-spacer";
    bar.appendChild(spacer);

    bar.appendChild(
        createActionButton("Close (Esc)", "close", ICON_PATHS.close, `${OVERLAY_BTN_CLASS} nu-mermaid-close`),
    );

    return { element: bar, diagramSource };
}

function buildViewport(sourceSvg: SVGElement) {
    const viewport = document.createElement("div");
    viewport.className = "nu-mermaid-viewport";

    const wrapper = document.createElement("div");
    wrapper.className = "mermaid nu-mermaid-fullscreen";

    const clonedSvg = sourceSvg.cloneNode(true) as SVGElement;
    clonedSvg.removeAttribute("style");

    const { width, height } = parseSvgDimensions(sourceSvg);
    const fitScale = calculateFitScale(width, height);
    clonedSvg.setAttribute("width", String(Math.round(width * fitScale)));
    clonedSvg.setAttribute("height", String(Math.round(height * fitScale)));

    const zoomBadge = document.createElement("span");
    zoomBadge.className = "nu-mermaid-zoom-badge";
    zoomBadge.textContent = "100%";

    wrapper.appendChild(clonedSvg);
    viewport.appendChild(wrapper);
    viewport.appendChild(zoomBadge);

    return { viewport, wrapper, zoomBadge };
}

function parseSvgDimensions(svg: SVGElement): { width: number; height: number } {
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
        const [, , w, h] = viewBox.split(/[\s,]+/).map(Number);
        if (w > 0 && h > 0) return { width: w, height: h };
    }
    return { width: 800, height: 600 };
}

function calculateFitScale(contentWidth: number, contentHeight: number): number {
    const maxWidth = window.innerWidth * VIEWPORT_FILL_RATIO;
    const maxHeight = (window.innerHeight - CONTROLS_BAR_HEIGHT_PX) * VIEWPORT_FILL_RATIO;
    return Math.min(maxWidth / contentWidth, maxHeight / contentHeight);
}
