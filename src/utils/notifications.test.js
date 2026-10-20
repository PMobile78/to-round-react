import { describe, it, expect } from 'vitest';
import {
    getDueTime,
    isOverdue,
    getDueNotifications,
    getActiveNotification,
    buildNotificationKey,
    notificationKeyPrefix,
    shouldShowStopPulsing
} from './notifications';

const HOUR = 60 * 60 * 1000;
const DUE = Date.parse('2026-06-14T12:00:00.000Z');

// Build a local naive ISO string ("YYYY-MM-DDTHH:mm:ss") from a Date so the
// values round-trip through parseLocalDateTime (local-time interpretation).
const localIso = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

describe('getDueTime', () => {
    it('returns null when there is no bubble or no due', () => {
        expect(getDueTime(null)).toBe(null);
        expect(getDueTime({})).toBe(null);
        expect(getDueTime({ dueAt: null })).toBe(null);
    });

    it('returns the moment of the due in ms', () => {
        expect(getDueTime({ dueAt: DUE })).toBe(DUE);
    });
});

describe('isOverdue', () => {
    it('is false for falsy / invalid dueDate', () => {
        expect(isOverdue(null)).toBe(false);
        expect(isOverdue('')).toBe(false);
        expect(isOverdue('garbage')).toBe(false);
    });

    it('is true when due is before now', () => {
        const past = localIso(new Date(2020, 0, 1, 0, 0, 0));
        expect(isOverdue(past, new Date(2026, 0, 1))).toBe(true);
    });

    it('is false when due is after now', () => {
        const future = localIso(new Date(2030, 0, 1, 0, 0, 0));
        expect(isOverdue(future, new Date(2026, 0, 1))).toBe(false);
    });

    it('accepts epoch-ms for now', () => {
        const past = localIso(new Date(2020, 0, 1, 0, 0, 0));
        expect(isOverdue(past, new Date(2026, 0, 1).getTime())).toBe(true);
    });

    it('boundary: exactly now is not overdue (strict <)', () => {
        const d = new Date(2026, 5, 14, 10, 0, 0);
        expect(isOverdue(localIso(d), d.getTime())).toBe(false);
    });
});

describe('getDueNotifications', () => {
    const bubble = { dueAt: DUE, reminders: [60, 1440, 10080] }; // 1 hour, 1 day, 1 week before

    it('returns [] when no due time or no reminders', () => {
        expect(getDueNotifications({ dueAt: null, reminders: [60] }, DUE)).toEqual([]);
        expect(getDueNotifications({ dueAt: DUE, reminders: [] }, DUE)).toEqual([]);
        expect(getDueNotifications({ dueAt: DUE }, DUE)).toEqual([]);
    });

    it('returns only the reminders that have come (target <= now < due), earliest first', () => {
        // 2 hours before the due: "1 hour" has not come yet, "1 day" and "1 week" have.
        const res = getDueNotifications(bubble, DUE - 2 * HOUR);
        expect(res.map((r) => r.idx)).toEqual([2, 1]);
        expect(res.map((r) => r.targetTime)).toEqual([DUE - 168 * HOUR, DUE - 24 * HOUR]);
    });

    it('returns nothing once the due has come', () => {
        expect(getDueNotifications(bubble, DUE)).toEqual([]);
    });
});

describe('getActiveNotification', () => {
    const bubble = { dueAt: DUE, reminders: [60, 1440] };

    it('returns null when no reminder has come', () => {
        expect(getActiveNotification(bubble, DUE - 25 * HOUR)).toBe(null);
    });

    it('returns the reminder that has come with the smallest target time', () => {
        const active = getActiveNotification(bubble, DUE - 30 * 60 * 1000);
        expect(active).toMatchObject({ idx: 1, targetTime: DUE - 24 * HOUR });
    });

    it('returns null past the due', () => {
        expect(getActiveNotification(bubble, DUE + 1)).toBe(null);
    });
});

describe('dedup keys', () => {
    it('builds a key from bubble id + target time', () => {
        expect(buildNotificationKey('abc', 1234)).toBe('abc:1234');
    });

    it('prefix matches keys for the bubble', () => {
        const prefix = notificationKeyPrefix('abc');
        expect(prefix).toBe('abc:');
        expect(buildNotificationKey('abc', 1234).startsWith(prefix)).toBe(true);
    });
});

describe('shouldShowStopPulsing: the button for every task that pulses (spec 4.1)', () => {
    const task = (overrides) => ({ id: 'b1', status: 'active', dueAt: DUE, reminders: [], repeat: null, pulseMuted: false, ...overrides });

    it('shows for an overdue task, with or without a repeat', () => {
        expect(shouldShowStopPulsing(task(), DUE + 1)).toBe(true);
        expect(shouldShowStopPulsing(task({ repeat: { every: 1, unit: 'days' } }), DUE + 1)).toBe(true);
    });

    it('shows while a reminder has come and the due has not', () => {
        expect(shouldShowStopPulsing(task({ reminders: [60] }), DUE - 30 * 60 * 1000)).toBe(true);
    });

    it('does not show before the first reminder or without a due', () => {
        expect(shouldShowStopPulsing(task({ reminders: [60] }), DUE - 2 * HOUR)).toBe(false);
        expect(shouldShowStopPulsing(task({ dueAt: null }), DUE + 1)).toBe(false);
    });

    it('does not show when the pulse is already stopped', () => {
        expect(shouldShowStopPulsing(task({ pulseMuted: true }), DUE + 1)).toBe(false);
    });

    it('does not show for a task that is done or deleted, or without a task', () => {
        expect(shouldShowStopPulsing(task({ status: 'done' }), DUE + 1)).toBe(false);
        expect(shouldShowStopPulsing(task({ status: 'deleted' }), DUE + 1)).toBe(false);
        expect(shouldShowStopPulsing(null, DUE + 1)).toBe(false);
    });
});
