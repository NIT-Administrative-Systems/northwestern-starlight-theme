/**
 * Mermaid toolbar entry point.
 *
 * Orchestrates diagram rendering, toolbar injection, and lifecycle management
 * across page loads, theme changes, and Astro view transitions.
 */

declare global {
    interface Window {
        /** Whether the hover toolbar is enabled (injected by the Northwestern Mermaid integration). */
        __NU_MERMAID_TOOLBAR__?: boolean;
        /** Northwestern Mermaid theme configs for light and dark modes. */
        __NU_MERMAID_CONFIGS__?: {
            light?: Record<string, unknown>;
            dark?: Record<string, unknown>;
        };
    }
}

import { openFullscreen } from "./fullscreen";
import { diagramSources, renderAllDiagrams } from "./render";
import { createActionButton, downloadDiagramSvg, flashSuccess, ICON_PATHS, writeToClipboard } from "./ui";

/** Maximum time (ms) to watch for lazy-rendered diagrams before disconnecting the observer. */
const TOOLBAR_OBSERVER_TIMEOUT_MS = 30_000;

/**
 * Inject hover toolbars into rendered mermaid diagrams.
 *
 * Safe to call repeatedly across page loads, lazy render callbacks, theme changes,
 * and Astro view transitions.
 *
 * **Idempotency guards:**
 * - Skips fullscreen clones (`.nu-mermaid-fullscreen`)
 * - Skips diagrams without a rendered `<svg>` child
 * - Skips diagrams that already have a `.nu-mermaid-toolbar`
 */
function injectToolbars(): number {
    const diagrams = document.querySelectorAll<HTMLElement>(".mermaid");
    if (!diagrams.length) return 0;

    let injectedCount = 0;

    diagrams.forEach((container) => {
        if (container.classList.contains("nu-mermaid-fullscreen")) return;
        if (!container.querySelector("svg")) return;
        if (container.querySelector(".nu-mermaid-toolbar")) return;

        const toolbar = document.createElement("div");
        toolbar.className = "nu-mermaid-toolbar";

        toolbar.appendChild(createActionButton("Fullscreen", "fullscreen", ICON_PATHS.fullscreen));
        toolbar.appendChild(createActionButton("Download SVG", "download-svg", ICON_PATHS.download));

        const source = diagramSources.get(container);
        if (source) {
            toolbar.appendChild(createActionButton("Copy Mermaid", "copy-source", ICON_PATHS.code));
        }

        container.style.position = "relative";
        container.appendChild(toolbar);
        injectedCount++;

        toolbar.addEventListener("click", (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".nu-mermaid-btn");
            if (!button) return;
            event.stopPropagation();

            const svg = container.querySelector("svg");
            if (!svg) return;

            const isKeyboardActivated = event.detail === 0;

            switch (button.dataset.action) {
                case "fullscreen":
                    openFullscreen(svg, container, button, isKeyboardActivated);
                    break;
                case "download-svg":
                    downloadDiagramSvg(svg, container);
                    flashSuccess(button, "Downloaded!");
                    break;
                case "copy-source":
                    if (source) writeToClipboard(source, button);
                    break;
            }
        });
    });

    return injectedCount;
}

function isToolbarEnabled(): boolean {
    return window.__NU_MERMAID_TOOLBAR__ !== false;
}

/**
 * Render diagrams and inject toolbars. Called on initial page load
 * and after Astro view transitions.
 */
function onPageReady(): void {
    void renderAllDiagrams(false).then(() => {
        if (isToolbarEnabled()) injectToolbars();

        // Watch for lazy-rendered diagrams that enter the viewport after initial load
        const domObserver = new MutationObserver(() => {
            if (isToolbarEnabled()) injectToolbars();
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => domObserver.disconnect(), TOOLBAR_OBSERVER_TIMEOUT_MS);
    });
}

// Re-render all diagrams and re-inject toolbars when the theme changes
const themeObserver = new MutationObserver(() => {
    void renderAllDiagrams(true).then(() => {
        if (isToolbarEnabled()) injectToolbars();
    });
});

themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
});

// Initial page load
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onPageReady);
} else {
    onPageReady();
}

// Astro view transitions
document.addEventListener("astro:page-load", onPageReady);
