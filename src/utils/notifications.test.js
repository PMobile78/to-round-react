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

// Build a local naive ISO string ("YYYY-MM-DDTHH:mm:ss") from a Date so the
// values round-trip through parseLocalDateTime (local-time interpretation).
const localIso = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

describe('getDueTime', () => {
    it('returns null when there is no bubble or dueDate', () => {
        expect(getDueTime(null)).toBe(null);
        expect(getDueTime({})).toBe(null);
        expect(getDueTime({ dueDate: null })).toBe(null);
    });

    it('returns null for an unparseable dueDate', () => {
        expect(getDueTime({ dueDate: 'not-a-date' })).toBe(null);
    });

    it('returns the parsed local time in ms', () => {
        const d = new Date(2026, 5, 14, 10, 0, 0);
        expect(getDueTime({ dueDate: localIso(d) })).toBe(d.getTime());
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
    const due = new Date(2026, 5, 14, 12, 0, 0); // bubble due at noon
    const bubble = {
        dueDate: localIso(due),
        notifications: ['10m', '1h', '1d'] // target = due - offset
    };

    it('returns [] when no due time or no notifications', () => {
        expect(getDueNotifications({ dueDate: null, notifications: ['10m'] }, Date.now())).toEqual([]);
        expect(getDueNotifications({ dueDate: bubble.dueDate, notifications: [] }, Date.now())).toEqual([]);
        expect(getDueNotifications({ dueDate: bubble.dueDate }, Date.now())).toEqual([]);
    });

    it('returns only matured notifications (target <= now < due), sorted by target asc', () => {
        // 30 min before due: '10m' not yet matured (target = due-10m, now < target),
        // '1h' matured (target = due-1h <= now), '1d' matured.
        const now = due.getTime() - 30 * 60 * 1000;
        const res = getDueNotifications(bubble, now);
        const idxs = res.map(r => r.idx);
        // ascending by targetTime: '1d' (idx 2, smallest target) before '1h' (idx 1)
        expect(idxs).toEqual([2, 1]);
        expect(res[0].targetTime).toBeLessThan(res[1].targetTime);
    });

    it('excludes notifications once now >= due', () => {
        const now = due.getTime() + 1000;
        expect(getDueNotifications(bubble, now)).toEqual([]);
    });
});

describe('getActiveNotification', () => {
    const due = new Date(2026, 5, 14, 12, 0, 0);
    const bubble = { dueDate: localIso(due), notifications: ['10m', '1h'] };

    it('returns null when nothing has matured', () => {
        const now = due.getTime() - 2 * 60 * 60 * 1000; // 2h before, neither matured
        expect(getActiveNotification(bubble, now)).toBe(null);
    });

    it('returns the matured notification with the smallest target time', () => {
        const now = due.getTime() - 5 * 60 * 1000; // 5 min before -> both matured, pick smallest target ('1h')
        const active = getActiveNotification(bubble, now);
        expect(active).not.toBe(null);
        expect(active.idx).toBe(1);
        expect(active.targetTime).toBe(due.getTime() - 60 * 60 * 1000);
    });

    it('returns null past the due date', () => {
        expect(getActiveNotification(bubble, due.getTime() + 1)).toBe(null);
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

describe('shouldShowStopPulsing', () => {
    const stickyIds = new Set();

    it('returns false for non-active bubble', () => {
        const bubble = { status: 'done', recurrence: { every: 1 } };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });

    it('returns false when no recurrence', () => {
        const bubble = { status: 'active', dueDate: localIso(new Date()) };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });

    it('returns false when recurrence.every < 1', () => {
        const bubble = { status: 'active', recurrence: { every: 0 } };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });

    it('returns true when overdue', () => {
        const past = new Date(2020, 0, 1, 0, 0, 0);
        const bubble = {
            status: 'active',
            dueDate: localIso(past),
            recurrence: { every: 1 }
        };
        const now = new Date(2026, 0, 1).getTime();
        expect(shouldShowStopPulsing(bubble, now, stickyIds)).toBe(true);
    });

    it('returns true inside a notification window', () => {
        const due = new Date(2026, 5, 14, 12, 0, 0);
        const now = due.getTime() - 5 * 60 * 1000; // 5 min before due
        const bubble = {
            status: 'active',
            id: 'test-bubble',
            dueDate: localIso(due),
            recurrence: { every: 1 },
            notifications: ['10m'] // target = due - 10m, now is due - 5m => inside window
        };
        expect(shouldShowStopPulsing(bubble, now, stickyIds)).toBe(true);
    });

    it('returns false when not yet in notification window', () => {
        const due = new Date(2026, 5, 14, 12, 0, 0);
        const now = due.getTime() - 15 * 60 * 1000; // 15 min before due
        const bubble = {
            status: 'active',
            id: 'test-bubble',
            dueDate: localIso(due),
            recurrence: { every: 1 },
            notifications: ['10m'] // target = due - 10m, now < target => not yet matured
        };
        expect(shouldShowStopPulsing(bubble, now, stickyIds)).toBe(false);
    });

    it('returns true when sticky id is present', () => {
        const future = new Date(2030, 0, 1, 0, 0, 0);
        const bubble = {
            id: 'sticky-bubble',
            status: 'active',
            dueDate: localIso(future),
            recurrence: { every: 1 }
        };
        const stickyWithId = new Set(['sticky-bubble']);
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyWithId)).toBe(true);
    });

    it('returns true when overdueSticky flag is set', () => {
        const future = new Date(2030, 0, 1, 0, 0, 0);
        const bubble = {
            status: 'active',
            dueDate: localIso(future),
            recurrence: { every: 1 },
            overdueSticky: true
        };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(true);
    });

    it('returns false for well-formed but not-yet-due, no sticky', () => {
        const future = new Date(2030, 0, 1, 0, 0, 0);
        const bubble = {
            status: 'active',
            dueDate: localIso(future),
            recurrence: { every: 1 },
            notifications: ['10m']
        };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });

    it('returns false on invalid dueDate', () => {
        const bubble = {
            status: 'active',
            dueDate: 'not-a-date',
            recurrence: { every: 1 }
        };
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });

    it('returns false on exception and catches errors gracefully', () => {
        const bubble = null;
        expect(shouldShowStopPulsing(bubble, Date.now(), stickyIds)).toBe(false);
    });
});
