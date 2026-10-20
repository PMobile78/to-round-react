/**
 * Pure helpers deciding whether the per-frame rAF loops should do work this
 * frame, gated on the Matter.js engine's awake/idle state (perf follow-up #78
 * to #76 / #77).
 *
 * #77 made the Matter Runner/Render loop sleep when the scene is idle. Two other
 * perpetual rAF loops kept doing O(N) work regardless:
 *   - TextOverlay label-position sync
 *   - useBubbleNotifications overdue/notification pulse
 * While the engine is paused, bubble bodies are frozen, so that work is
 * redundant. These helpers encode "does the loop need to run this frame?" so the
 * loops can skip the work while idle — without changing visible behaviour.
 *
 * No Matter.js / DOM side effects here: every function is a pure data→decision
 * mapping, so they are unit-testable in isolation.
 */
import { isPulsing } from './notifications';

/**
 * TextOverlay only needs to re-map label positions while bodies can move, i.e.
 * while the engine is awake. When asleep, positions are frozen and already
 * drawn, so the O(N) map + setPositions can be skipped.
 *
 * `isAwake` is `engine.isAwake?.()`. We treat anything other than an explicit
 * `false` as awake, so a missing/not-yet-created engine (the overlay rAF starts
 * before engineRef is set) keeps syncing rather than freezing labels.
 */
export const shouldSyncOverlayPositions = (isAwake) => isAwake !== false;

/**
 * Whether a single (active) bubble has crossed into a state that needs pulsing
 * right now — used only while the engine is asleep to decide whether to wake it.
 * Mirrors the pulse conditions in useBubbleNotifications' animate(), minus the
 * Matter side effects and the `status === ACTIVE` / `body` guards the caller
 * already applies:
 *   - stopped (manual stop / `pulseMuted`) never pulses
 *   - a matured, not-yet-due reminder pulses
 *   - otherwise: overdue (`now >= due`)
 *
 * `suppressedIds` is the live Set the hook keeps; it may be omitted in tests.
 */
export const bubbleShouldPulse = (bubble, now, { suppressedIds } = {}) => {
    if (!bubble) return false;
    if (suppressedIds && suppressedIds.has(bubble.id)) return false;
    return isPulsing(bubble, now);
};
