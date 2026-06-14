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
