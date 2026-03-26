/**
 * Focus management and keyboard shortcut handler for the fullscreen overlay.
 *
 * Implements WCAG-compliant focus trapping (Tab/Shift+Tab cycle within the dialog),
 * zoom/pan keyboard shortcuts, and modality-aware initial focus placement.
 */

import type { PanZoomController } from "./pan-zoom";

/** Configuration for {@link installKeyboardAndFocus}. */
export interface KeyboardFocusConfig {
    /** The dialog overlay element (focus trap boundary). */
    overlay: HTMLElement;
    /** The controls bar containing focusable buttons. */
    controls: HTMLElement;
    /** Pan/zoom controller for keyboard zoom and arrow-key panning. */
    panZoom: PanZoomController;
    /** Callback to close the overlay (triggered by Escape). */
    onClose: () => void;
    /** Whether the overlay was opened via keyboard (Enter/Space on the trigger button). */
    openedViaKeyboard: boolean;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const KEYBOARD_ZOOM_FACTOR = 1.2;
const ARROW_PAN_DISTANCE = 50;

/** Map of keyboard shortcuts to their handler functions. */
type ShortcutHandler = (pz: PanZoomController, close: () => void) => void;

const KEYBOARD_SHORTCUTS: Record<string, ShortcutHandler> = {
    Escape: (_pz, close) => close(),
    "+": (pz) => pz.zoomTo(pz.scale * KEYBOARD_ZOOM_FACTOR),
    "=": (pz) => pz.zoomTo(pz.scale * KEYBOARD_ZOOM_FACTOR),
    "-": (pz) => pz.zoomTo(pz.scale / KEYBOARD_ZOOM_FACTOR),
    _: (pz) => pz.zoomTo(pz.scale / KEYBOARD_ZOOM_FACTOR),
    "0": (pz) => pz.resetView(),
    ArrowUp: (pz) => pz.panBy(0, ARROW_PAN_DISTANCE),
    ArrowDown: (pz) => pz.panBy(0, -ARROW_PAN_DISTANCE),
    ArrowLeft: (pz) => pz.panBy(ARROW_PAN_DISTANCE, 0),
    ArrowRight: (pz) => pz.panBy(-ARROW_PAN_DISTANCE, 0),
};

/**
 * Install keyboard event handlers and set initial focus.
 *
 * Focus placement depends on how the overlay was opened:
 * - **Keyboard** (Enter/Space): focuses the first control button with a visible focus ring.
 * - **Mouse** (click): focuses the overlay container itself (invisible, but allows Tab to work).
 *
 * @returns A cleanup function that removes all installed listeners.
 */
export function installKeyboardAndFocus({
    overlay,
    controls,
    panZoom,
    onClose,
    openedViaKeyboard,
}: KeyboardFocusConfig): () => void {
    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Tab") {
            trapFocus(overlay, event);
            return;
        }

        const handler = KEYBOARD_SHORTCUTS[event.key];
        if (handler) {
            handler(panZoom, onClose);
            event.preventDefault();
        }
    }

    window.addEventListener("keydown", handleKeydown);

    if (openedViaKeyboard) {
        controls.querySelector<HTMLElement>(".nu-mermaid-btn")?.focus();
    } else {
        overlay.setAttribute("tabindex", "-1");
        overlay.focus();
    }

    return () => window.removeEventListener("keydown", handleKeydown);
}

/** Cycle Tab/Shift+Tab focus within the overlay boundary. */
function trapFocus(boundary: HTMLElement, event: KeyboardEvent): void {
    const focusableElements = boundary.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
}
