/**
 * Pure notification decision logic extracted from BubblesPage's rAF pulse loop
 * (Task 3/6 of #38). No Matter.js / Firestore / DOM side effects — every
 * function is a pure mapping from data to a decision, so they are unit-testable.
 *
 * Note: next-notify / reschedule scheduling lives server-side (Cloud Functions);
 * the client only decides *when to pulse* and *which notification is active*.
 */
import { parseLocalDateTime } from './dateTime';

const MINUTE_MS = 60 * 1000;

/**
 * The moment of the due (ms) of a bubble — its dueAt, set by bubbleFromTask — or null without one.
 */
export const getDueTime = (bubble) => (bubble && Number.isFinite(bubble.dueAt) ? bubble.dueAt : null);

/**
 * Is `dueDate` in the past relative to `now`?
 * `now` may be a Date or epoch-ms; defaults to the current time.
 */
export const isOverdue = (dueDate, now = new Date()) => {
    if (!dueDate) return false;
    const parsed = parseLocalDateTime(dueDate);
    if (!parsed) return false;
    const nowMs = now instanceof Date ? now.getTime() : now;
    return parsed.getTime() < nowMs;
};

/**
 * Reminders that have "matured" for a bubble at time `now` — i.e. their
 * target time has passed but the due hasn't. `reminders` are minutes before
 * the due (spec 3.1). Returns `{ idx, targetTime, minutes }[]` sorted by
 * `targetTime` ascending (earliest-scheduled target first).
 */
export const getDueNotifications = (bubble, now) => {
    const due = getDueTime(bubble);
    if (due === null || !Array.isArray(bubble.reminders)) return [];
    return bubble.reminders
        .map((minutes, idx) => ({ idx, targetTime: due - minutes * MINUTE_MS, minutes }))
        .sort((a, b) => a.targetTime - b.targetTime)
        .filter(({ targetTime }) => now >= targetTime && now < due);
};

/**
 * The single active notification to pulse by — the matured, not-yet-due
 * notification with the smallest target time (earliest-scheduled), or null.
 * Mirrors the original loop that returned the first ascending-sorted match.
 */
export const getActiveNotification = (bubble, now) => {
    const due = getDueTime(bubble);
    if (due === null) return null;
    const dueList = getDueNotifications(bubble, now);
    return dueList.length > 0 ? dueList[0] : null;
};

/**
 * Dedup key for a fired notification occurrence (bubble + its target time).
 */
export const buildNotificationKey = (bubbleId, targetTime) => `${bubbleId}:${targetTime}`;

/**
 * Prefix matching every dedup key that belongs to a bubble.
 */
export const notificationKeyPrefix = (bubbleId) => `${bubbleId}:`;

/**
 * Whether a bubble pulses at time `now`: it has a due, its pulse is not stopped
 * (pulseMuted), and a reminder has come or the due has passed.
 */
export const isPulsing = (bubble, now) => {
    const due = getDueTime(bubble);
    if (due === null || bubble.pulseMuted) return false;
    return now >= due || getActiveNotification(bubble, now) !== null;
};

/**
 * Whether the edit dialog shows the "stop pulsing" button (spec 4.1): for every
 * active task that pulses at time `now` (ms).
 */
export const shouldShowStopPulsing = (bubble, now) => Boolean(bubble)
    && bubble.status === 'active'
    && isPulsing(bubble, now);
