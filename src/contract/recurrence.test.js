import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/recurrence.json';
import { nextFutureOccurrence, stepOccurrence } from './recurrence';

describe('nextFutureOccurrence (contract fixtures)', () => {
    it.each(fixtures)('$name', ({ due, repeat, now, expected }) => {
        expect(nextFutureOccurrence(due.local, due.tz, repeat, new Date(now))).toBe(expected);
    });
});

describe('stepOccurrence', () => {
    it('rejects units removed from the contract', () => {
        expect(() => stepOccurrence('2026-10-14T09:00', 'UTC', { every: 30, unit: 'minutes' })).toThrow();
    });

    it('rejects malformed wall-clock values', () => {
        expect(() => stepOccurrence('2026-10-14T09:00:00', 'UTC', { every: 1, unit: 'days' })).toThrow();
    });
});
