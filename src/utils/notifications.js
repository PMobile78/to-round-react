/**
 * Pure notification decision logic extracted from BubblesPage's rAF pulse loop
 * (Task 3/6 of #38). No Matter.js / Firestore / DOM side effects — every
 * function is a pure mapping from data to a decision, so they are unit-testable.
 *
 * Note: next-notify / reschedule scheduling lives server-side (Cloud Functions);
 * the client only decides *when to pulse* and *which notification is active*.
 */
import { parseLocalDateTime, getOffsetMs } from './dateTime';

/**
 * Parsed due time (ms) for a bubble, or null when there's no/invalid dueDate.
 */
export const getDueTime = (bubble) => {
    if (!bubble || !bubble.dueDate) return null;
    const parsed = parseLocalDateTime(bubble.dueDate);
    return parsed ? parsed.getTime() : null;
};

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
 * Notifications that have "matured" for a bubble at time `now` — i.e. their
 * target time has passed but the due date hasn't. Returns
 * `{ idx, targetTime, notif }[]` sorted by `targetTime` ascending
 * (earliest-scheduled target first).
 */
export const getDueNotifications = (bubble, now) => {
    const due = getDueTime(bubble);
    if (due === null) return [];
    if (!Array.isArray(bubble.notifications) || bubble.notifications.length === 0) return [];
    return bubble.notifications
        .map((notif, idx) => ({ idx, targetTime: due - getOffsetMs(notif), notif }))
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
 * Whether the edit dialog should show the "stop pulsing" button.
 * Returns true if the bubble is active with a valid recurrence and is currently
 * inside a notification window, overdue, or flagged sticky.
 *
 * @param {Object} bubble - The bubble to check
 * @param {number} now - Current time in ms
 * @param {Set} stickyPulseIds - Set of bubble IDs that are sticky-pulsing
 * @returns {boolean} true if the stop button should show
 */
export function shouldShowStopPulsing(bubble, now, stickyPulseIds) {
    try {
        if (!bubble || bubble.status !== 'active') return false;

        const rec = bubble.recurrence;
        const every = rec && typeof rec === 'object' ? Number(rec.every) : NaN;
        if (!Number.isFinite(every) || every < 1) return false;

        // Check if inside notification window or overdue
        if (bubble.dueDate) {
            const parsedDue = parseLocalDateTime(bubble.dueDate);
            if (!parsedDue) return false;
            const due = parsedDue.getTime();

            // Check notification windows
            if (Array.isArray(bubble.notifications) && bubble.notifications.length > 0) {
                for (const notif of bubble.notifications) {
                    const offsetMs = getOffsetMs(notif);
                    const targetTime = due - offsetMs;
                    if (Number.isFinite(targetTime) && now >= targetTime && now < due) return true;
                }
            }

            // Check if overdue
            if (now >= due) return true;
        }

        // Check sticky flag
        if (bubble.overdueSticky || stickyPulseIds.has(bubble.id)) return true;

        return false;
    } catch (_) {
        return false;
    }
}
