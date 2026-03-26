/**
 * Fullscreen viewer coordinator.
 *
 * Wires together overlay construction, pan/zoom interaction, keyboard/focus
 * management, and controls bar action dispatch. Manages the open/close
 * lifecycle including entry/exit animations and focus restoration.
 */

import { installKeyboardAndFocus } from "./focus";
import { buildOverlay } from "./overlay";
import { createPanZoomController } from "./pan-zoom";
import { downloadDiagramSvg, flashSuccess, showToast, writeToClipboard } from "./ui";

const OPEN_SCALE = "scale(0.97)";
const OPEN_TRANSITION = "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)";
const OPEN_DURATION_MS = 300;
const CLOSE_TRANSITION = "transform 200ms ease-in";
const CLOSE_DURATION_MS = 200;
const CLOSE_SCALE_FACTOR = 0.97;

/**
 * Open the fullscreen viewer for a rendered Mermaid diagram.
 *
 * @param diagramSvg - The rendered SVG element to display (cloned, not modified).
 * @param diagramContainer - The `pre.mermaid` container holding the diagram.
 * @param triggerButton - The button that opened fullscreen (receives focus on close).
 * @param openedViaKeyboard - `true` if opened with Enter/Space (shows focus ring on first control).
 */
export function openFullscreen(
    diagramSvg: SVGElement,
    diagramContainer: HTMLElement,
    triggerButton?: HTMLElement,
    openedViaKeyboard = false,
): void {
    const { overlay, controls, viewport, wrapper, zoomBadge, diagramSource } = buildOverlay(
        diagramSvg,
        diagramContainer,
    );

    overlay.style.opacity = "0";
    wrapper.style.transform = OPEN_SCALE;
    wrapper.style.transition = OPEN_TRANSITION;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        wrapper.style.transform = "scale(1)";
        setTimeout(() => {
            wrapper.style.transition = "";
        }, OPEN_DURATION_MS);
    });

    const panZoom = createPanZoomController(viewport, wrapper, zoomBadge);

    controls.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".nu-mermaid-overlay-btn");
        if (!button) return;

        switch (button.dataset.action) {
            case "close":
                closeOverlay();
                break;
            case "zoom-in":
                panZoom.zoomTo(panZoom.scale * 1.3);
                break;
            case "zoom-out":
                panZoom.zoomTo(panZoom.scale * 0.7);
                break;
            case "zoom-reset":
                panZoom.resetView();
                break;
            case "download-svg":
                downloadDiagramSvg(diagramSvg, diagramContainer);
                flashSuccess(button, "Downloaded!");
                break;
            case "copy-svg":
                writeToClipboard(diagramSvg.outerHTML, button);
                showToast(viewport, "SVG copied to clipboard");
                break;
            case "copy-source":
                if (diagramSource) {
                    writeToClipboard(diagramSource, button);
                    showToast(viewport, "Mermaid source copied to clipboard");
                }
                break;
        }
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeOverlay();
    });

    const removeKeyboardHandlers = installKeyboardAndFocus({
        overlay,
        controls,
        panZoom,
        onClose: closeOverlay,
        openedViaKeyboard,
    });

    let closed = false;
    function closeOverlay(): void {
        if (closed) return;
        closed = true;
        panZoom.destroy();

        overlay.style.opacity = "0";
        wrapper.style.transition = CLOSE_TRANSITION;
        wrapper.style.transform = `translate(${panZoom.panX}px, ${panZoom.panY}px) scale(${panZoom.scale * CLOSE_SCALE_FACTOR})`;

        triggerButton?.focus();

        setTimeout(() => {
            removeKeyboardHandlers();
            document.body.style.overflow = "";
            overlay.remove();
        }, CLOSE_DURATION_MS);
    }
}
