/**
 * Pan/zoom interaction controller for the fullscreen Mermaid viewport.
 *
 * Manages all pointer interactions: cursor-anchored wheel zoom, mouse drag
 * with momentum, touch pan/pinch-to-zoom, and double-click zoom.
 * Returns a controller object with methods to programmatically zoom, pan,
 * reset, and tear down all listeners.
 */

/** Controller returned by {@link createPanZoomController}. */
export interface PanZoomController {
    /** Current horizontal pan offset in pixels. */
    readonly panX: number;
    /** Current vertical pan offset in pixels. */
    readonly panY: number;
    /** Current zoom scale relative to initial fit (1.0 = 100%). */
    readonly scale: number;
    /** Set the zoom scale, clamped to [{@link MIN_SCALE}, {@link MAX_SCALE}]. */
    zoomTo(scale: number): void;
    /** Reset pan and zoom to the initial state (0, 0, 1.0). */
    resetView(): void;
    /** Shift the pan offset by the given pixel deltas. */
    panBy(dx: number, dy: number): void;
    /** Cancel any active inertia and remove all event listeners. */
    destroy(): void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
const WHEEL_ZOOM_IN_FACTOR = 1.1;
const WHEEL_ZOOM_OUT_FACTOR = 0.9;
const DOUBLE_CLICK_ZOOM_FACTOR = 1.5;
const INERTIA_FRICTION = 0.92;
const INERTIA_MIN_VELOCITY = 0.5;
const INERTIA_RELEASE_WINDOW_MS = 50;
const FRAME_DURATION_MS = 16;

/**
 * Create a pan/zoom controller bound to the given viewport elements.
 *
 * @param viewport - The scrollable container that receives pointer events.
 * @param wrapper - The inner element that receives CSS transforms.
 * @param zoomBadge - The element displaying the current zoom percentage.
 */
export function createPanZoomController(
    viewport: HTMLElement,
    wrapper: HTMLElement,
    zoomBadge: HTMLElement,
): PanZoomController {
    let scale = 1;
    let panX = 0;
    let panY = 0;

    function applyTransform(): void {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        wrapper.style.transformOrigin = "center center";
        zoomBadge.textContent = `${Math.round(scale * 100)}%`;
    }

    function clampScale(value: number): number {
        return Math.min(Math.max(MIN_SCALE, value), MAX_SCALE);
    }

    function zoomTo(newScale: number): void {
        scale = clampScale(newScale);
        applyTransform();
    }

    function resetView(): void {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform();
    }

    function panBy(dx: number, dy: number): void {
        panX += dx;
        panY += dy;
        applyTransform();
    }

    /**
     * Zoom toward a specific screen coordinate so the point under the
     * cursor/finger stays fixed. Used by wheel, double-click, and pinch.
     */
    function zoomTowardPoint(clientX: number, clientY: number, targetScale: number): void {
        const clamped = clampScale(targetScale);
        const rect = viewport.getBoundingClientRect();
        const cursorX = clientX - rect.left - rect.width / 2;
        const cursorY = clientY - rect.top - rect.height / 2;
        const ratio = 1 - clamped / scale;
        panX += (cursorX - panX) * ratio;
        panY += (cursorY - panY) * ratio;
        scale = clamped;
        applyTransform();
    }

    let velocityX = 0;
    let velocityY = 0;
    let lastMoveTimestamp = 0;
    let inertiaFrameId = 0;

    function runInertia(): void {
        cancelAnimationFrame(inertiaFrameId);
        function tick(): void {
            if (Math.abs(velocityX) < INERTIA_MIN_VELOCITY && Math.abs(velocityY) < INERTIA_MIN_VELOCITY) return;
            panX += velocityX;
            panY += velocityY;
            velocityX *= INERTIA_FRICTION;
            velocityY *= INERTIA_FRICTION;
            applyTransform();
            inertiaFrameId = requestAnimationFrame(tick);
        }
        inertiaFrameId = requestAnimationFrame(tick);
    }

    function cancelInertia(): void {
        cancelAnimationFrame(inertiaFrameId);
        velocityX = 0;
        velocityY = 0;
    }

    /** Record the velocity for a movement delta, normalized to 16ms frames. */
    function trackVelocity(dx: number, dy: number, timestamp: number): void {
        const elapsed = timestamp - lastMoveTimestamp;
        if (elapsed > 0) {
            velocityX = dx * (FRAME_DURATION_MS / elapsed);
            velocityY = dy * (FRAME_DURATION_MS / elapsed);
        }
        lastMoveTimestamp = timestamp;
    }

    /** Start inertia only if the last movement was recent (finger/mouse was still moving at release). */
    function releaseWithMomentum(): void {
        if (performance.now() - lastMoveTimestamp < INERTIA_RELEASE_WINDOW_MS) {
            runInertia();
        }
    }

    function handleWheel(event: WheelEvent): void {
        event.preventDefault();
        const factor = event.deltaY > 0 ? WHEEL_ZOOM_OUT_FACTOR : WHEEL_ZOOM_IN_FACTOR;
        zoomTowardPoint(event.clientX, event.clientY, scale * factor);
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    let isMousePanning = false;
    let mouseAnchorX = 0;
    let mouseAnchorY = 0;
    let previousMouseX = 0;
    let previousMouseY = 0;

    function handleMouseDown(event: MouseEvent): void {
        cancelInertia();
        isMousePanning = true;
        mouseAnchorX = event.clientX - panX;
        mouseAnchorY = event.clientY - panY;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
        lastMoveTimestamp = performance.now();
        viewport.style.cursor = "grabbing";
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent): void {
        if (!isMousePanning) return;
        trackVelocity(event.clientX - previousMouseX, event.clientY - previousMouseY, performance.now());
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
        panX = event.clientX - mouseAnchorX;
        panY = event.clientY - mouseAnchorY;
        applyTransform();
    }

    function handleMouseUp(): void {
        isMousePanning = false;
        viewport.style.cursor = "grab";
        releaseWithMomentum();
    }

    viewport.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    let isTouchPanning = false;
    let pinchDistance = 0;
    let touchCenterX = 0;
    let touchCenterY = 0;

    function handleTouchStart(event: TouchEvent): void {
        cancelInertia();
        if (event.touches.length === 1) {
            isTouchPanning = true;
            touchCenterX = event.touches[0].clientX;
            touchCenterY = event.touches[0].clientY;
            lastMoveTimestamp = performance.now();
        } else if (event.touches.length === 2) {
            isTouchPanning = false;
            pinchDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY,
            );
            touchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            touchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        }
        event.preventDefault();
    }

    function handleTouchMove(event: TouchEvent): void {
        if (event.touches.length === 1 && isTouchPanning) {
            const dx = event.touches[0].clientX - touchCenterX;
            const dy = event.touches[0].clientY - touchCenterY;
            trackVelocity(dx, dy, performance.now());
            panX += dx;
            panY += dy;
            touchCenterX = event.touches[0].clientX;
            touchCenterY = event.touches[0].clientY;
            applyTransform();
        } else if (event.touches.length === 2) {
            const distance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY,
            );
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

            if (pinchDistance > 0) {
                zoomTowardPoint(midX, midY, scale * (distance / pinchDistance));
                panX += midX - touchCenterX;
                panY += midY - touchCenterY;
                applyTransform();
            }

            pinchDistance = distance;
            touchCenterX = midX;
            touchCenterY = midY;
        }
        event.preventDefault();
    }

    function handleTouchEnd(): void {
        const wasPanning = isTouchPanning;
        isTouchPanning = false;
        pinchDistance = 0;
        if (wasPanning) releaseWithMomentum();
    }

    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd);

    function handleDoubleClick(event: MouseEvent): void {
        event.preventDefault();
        zoomTowardPoint(event.clientX, event.clientY, scale * DOUBLE_CLICK_ZOOM_FACTOR);
    }

    viewport.addEventListener("dblclick", handleDoubleClick);

    return {
        get panX() {
            return panX;
        },
        get panY() {
            return panY;
        },
        get scale() {
            return scale;
        },
        zoomTo,
        resetView,
        panBy,
        destroy(): void {
            cancelInertia();
            viewport.removeEventListener("wheel", handleWheel);
            viewport.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            viewport.removeEventListener("touchstart", handleTouchStart);
            viewport.removeEventListener("touchmove", handleTouchMove);
            viewport.removeEventListener("touchend", handleTouchEnd);
            viewport.removeEventListener("dblclick", handleDoubleClick);
        },
    };
}
