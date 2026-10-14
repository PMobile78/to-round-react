import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/time.json';
import { toInstant, toLocal, parseLocal, isValidTimeZone } from './time';

describe('toInstant (contract fixtures)', () => {
    it.each(fixtures.toInstant)('$name', ({ local, tz, instant }) => {
        expect(toInstant(local, tz).toISOString()).toBe(instant);
    });
});

describe('toLocal (contract fixtures)', () => {
    it.each(fixtures.toLocal)('$name', ({ instant, tz, local }) => {
        expect(toLocal(new Date(instant), tz)).toBe(local);
    });
});

describe('toInstant with a zone this runtime does not know', () => {
    it('throws instead of guessing a time', () => {
        expect(() => toInstant('2026-10-14T09:00', 'Mars/Olympus')).toThrow(RangeError);
    });
});

describe('parseLocal', () => {
    it('parses a valid wall-clock value', () => {
        expect(parseLocal('2026-10-14T09:05')).toEqual({ year: 2026, month: 10, day: 14, hour: 9, minute: 5 });
    });

    it('rejects malformed and impossible values', () => {
        expect(parseLocal('2026-02-30T09:00')).toBeNull();
        expect(parseLocal('2026-10-14T24:00')).toBeNull();
        expect(parseLocal('2026-10-14T09:00:00')).toBeNull();
        expect(parseLocal('2026-10-14 09:00')).toBeNull();
        expect(parseLocal(null)).toBeNull();
    });
});

describe('isValidTimeZone', () => {
    it('accepts IANA zones and rejects anything else', () => {
        expect(isValidTimeZone('Europe/Kyiv')).toBe(true);
        expect(isValidTimeZone('UTC')).toBe(true);
        expect(isValidTimeZone('Mars/Olympus')).toBe(false);
        expect(isValidTimeZone('')).toBe(false);
        expect(isValidTimeZone(null)).toBe(false);
    });
});
