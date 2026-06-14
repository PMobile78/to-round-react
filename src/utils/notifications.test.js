import { describe, it, expect } from 'vitest';
import {
    getDueTime,
    isOverdue,
    getDueNotifications,
    getActiveNotification,
    buildNotificationKey,
    notificationKeyPrefix
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
