/**
 * Pure helpers for deciding when the Matter.js loop can be paused (perf fix #76).
 * Used by useMatterEngine to stop the Runner/Render rAF loop once the scene is at
 * rest, eliminating the continuous idle CPU/GPU work.
 */

// Bubble bodies are created with this Matter label (see useMatterEngine).
const BUBBLE_LABEL = 'Circle Body';

/**
 * True when no bubble body is awake — i.e. every 'Circle Body' is sleeping, or
 * there are none. Non-bubble bodies (walls, mouse constraint) are ignored.
 */
export const areBubblesAtRest = (bodies) =>
    bodies.filter((b) => b.label === BUBBLE_LABEL).every((b) => b.isSleeping === true);

/**
 * The engine loop may pause only when the bubbles are at rest AND the user is not
 * dragging (a held body stays awake, but we keep the loop running for responsiveness).
 */
export const shouldPauseEngine = ({ bodies, isDragging }) =>
    !isDragging && areBubblesAtRest(bodies);
