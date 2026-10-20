import { describe, it, expect } from 'vitest';
import { shouldSyncOverlayPositions, bubbleShouldPulse } from './rafGating';

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
    const HOUR = 60 * 60 * 1000;
    const now = Date.parse('2026-06-16T12:00:00.000Z');

    it('is false without a bubble or a due', () => {
        expect(bubbleShouldPulse(null, now)).toBe(false);
        expect(bubbleShouldPulse({ id: 'a' }, now)).toBe(false);
        expect(bubbleShouldPulse({ id: 'a', dueAt: null }, now)).toBe(false);
    });

    it('is false when the due is still ahead', () => {
        expect(bubbleShouldPulse({ id: 'a', dueAt: now + HOUR, reminders: [] }, now)).toBe(false);
    });

    it('is true once the due has passed (overdue)', () => {
        expect(bubbleShouldPulse({ id: 'a', dueAt: now - HOUR, reminders: [] }, now)).toBe(true);
    });

    it('is true when a reminder has come (its moment passed, the due not yet)', () => {
        // due in 1 hour, reminder 2 hours before it: came an hour ago
        expect(bubbleShouldPulse({ id: 'a', dueAt: now + HOUR, reminders: [120] }, now)).toBe(true);
    });

    it('is false when no reminder has come yet', () => {
        // due in 2 hours, reminder 1 hour before it: comes in an hour
        expect(bubbleShouldPulse({ id: 'a', dueAt: now + 2 * HOUR, reminders: [60] }, now)).toBe(false);
    });

    it('is false when the pulse is stopped (pulseMuted), even if overdue', () => {
        expect(bubbleShouldPulse({ id: 'a', dueAt: now - HOUR, reminders: [], pulseMuted: true }, now)).toBe(false);
    });

    it('is false when suppressed via suppressedIds, even if overdue', () => {
        const suppressedIds = new Set(['a']);
        expect(bubbleShouldPulse({ id: 'a', dueAt: now - HOUR, reminders: [] }, now, { suppressedIds })).toBe(false);
    });
});
