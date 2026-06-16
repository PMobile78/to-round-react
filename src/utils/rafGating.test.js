import { describe, it, expect } from 'vitest';
import { shouldSyncOverlayPositions, bubbleShouldPulse } from './rafGating';

// Build a local naive ISO string ("YYYY-MM-DDTHH:mm:ss") from a Date so the
// values round-trip through parseLocalDateTime (local-time interpretation).
const localIso = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

describe('shouldSyncOverlayPositions', () => {
    it('syncs while the engine is awake', () => {
        expect(shouldSyncOverlayPositions(true)).toBe(true);
    });

    it('skips while the engine is explicitly asleep', () => {
        expect(shouldSyncOverlayPositions(false)).toBe(false);
    });

    it('defaults to syncing when awake-state is unknown (engine not ready yet)', () => {
        // The overlay rAF starts before engineRef is set; never freeze labels then.
        expect(shouldSyncOverlayPositions(undefined)).toBe(true);
        expect(shouldSyncOverlayPositions(null)).toBe(true);
    });
});

describe('bubbleShouldPulse', () => {
    const now = new Date(2026, 5, 16, 12, 0, 0).getTime();
    const future = new Date(2026, 5, 16, 13, 0, 0); // +1h
    const past = new Date(2026, 5, 16, 11, 0, 0);    // -1h

    it('is false without a bubble or dueDate', () => {
        expect(bubbleShouldPulse(null, now)).toBe(false);
        expect(bubbleShouldPulse({ id: 'a' }, now)).toBe(false);
        expect(bubbleShouldPulse({ id: 'a', dueDate: null }, now)).toBe(false);
    });

    it('is false for an unparseable dueDate', () => {
        expect(bubbleShouldPulse({ id: 'a', dueDate: 'not-a-date' }, now)).toBe(false);
    });

    it('is false when the due time is still in the future', () => {
        expect(bubbleShouldPulse({ id: 'a', dueDate: localIso(future) }, now)).toBe(false);
    });

    it('is true once the due time has passed (overdue)', () => {
        expect(bubbleShouldPulse({ id: 'a', dueDate: localIso(past) }, now)).toBe(true);
    });

    it('is true for an overdueSticky bubble even before its due time', () => {
        expect(bubbleShouldPulse({ id: 'a', dueDate: localIso(future), overdueSticky: true }, now)).toBe(true);
    });

    it('is true when the bubble id is in stickyIds even before its due time', () => {
        const stickyIds = new Set(['a']);
        expect(bubbleShouldPulse({ id: 'a', dueDate: localIso(future) }, now, { stickyIds })).toBe(true);
    });

    it('is true when a notification has matured (target passed, due not yet)', () => {
        // due in +1h (13:00), notification 90 min before due => target at 11:30 => matured at 12:00
        const bubble = {
            id: 'a',
            dueDate: localIso(future),
            notifications: ['90m']
        };
        expect(bubbleShouldPulse(bubble, now)).toBe(true);
    });

    it('is false when a notification has not matured yet', () => {
        // due in +1h (13:00), notification 15 min before due => target at 12:45 => not yet at 12:00
        const bubble = {
            id: 'a',
            dueDate: localIso(future),
            notifications: ['15m']
        };
        expect(bubbleShouldPulse(bubble, now)).toBe(false);
    });

    it('is false when suppressed via overduePulseSuppressed, even if overdue', () => {
        const bubble = { id: 'a', dueDate: localIso(past), overduePulseSuppressed: true };
        expect(bubbleShouldPulse(bubble, now)).toBe(false);
    });

    it('is false when suppressed via suppressedIds, even if overdue', () => {
        const suppressedIds = new Set(['a']);
        const bubble = { id: 'a', dueDate: localIso(past) };
        expect(bubbleShouldPulse(bubble, now, { suppressedIds })).toBe(false);
    });

    it('suppression wins over sticky', () => {
        const bubble = { id: 'a', dueDate: localIso(past), overdueSticky: true, overduePulseSuppressed: true };
        expect(bubbleShouldPulse(bubble, now)).toBe(false);
    });
});
