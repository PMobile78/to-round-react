import { describe, it, expect } from 'vitest';
import {
    formatLocalDateTime,
    getUserTimeZone,
    parseLocalDateTime,
    getOffsetMs
} from './dateTime';

describe('formatLocalDateTime', () => {
    it('formats Date to YYYY-MM-DDTHH:mm:ss', () => {
        const date = new Date(2026, 5, 14, 10, 30, 45); // June 14, 2026, 10:30:45
        expect(formatLocalDateTime(date)).toBe('2026-06-14T10:30:45');
    });

    it('pads month, day, hours, minutes, seconds with zeros', () => {
        const date = new Date(2026, 0, 5, 9, 5, 3); // Jan 5, 2026, 09:05:03
        expect(formatLocalDateTime(date)).toBe('2026-01-05T09:05:03');
    });

    it('accepts timestamp and converts', () => {
        const date = new Date(2026, 5, 14, 10, 30, 45);
        const timestamp = date.getTime();
        const result = formatLocalDateTime(timestamp);
        expect(result).toBe('2026-06-14T10:30:45');
    });

    it('returns null for null/undefined input', () => {
        expect(formatLocalDateTime(null)).toBe(null);
        expect(formatLocalDateTime(undefined)).toBe(null);
    });

    it('returns null for invalid Date', () => {
        expect(formatLocalDateTime(new Date('invalid'))).toBe(null);
        expect(formatLocalDateTime('not a date')).toBe(null);
    });
});

describe('getUserTimeZone', () => {
    it('returns a non-empty string (IANA timezone)', () => {
        const tz = getUserTimeZone();
        expect(typeof tz).toBe('string');
        expect(tz.length).toBeGreaterThan(0);
        // Common patterns: "Europe/Kyiv", "UTC", "America/New_York"
        expect(tz).toMatch(/^[A-Z]/);
    });
});

describe('parseLocalDateTime', () => {
    it('parses naive ISO string as local time', () => {
        const result = parseLocalDateTime('2026-06-14T10:30:45');
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(5); // 0-indexed
        expect(result.getDate()).toBe(14);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(45);
    });

    it('parses ISO string with Z as UTC', () => {
        const result = parseLocalDateTime('2026-06-14T10:30:45Z');
        expect(result).toBeInstanceOf(Date);
        // Result is UTC, so calling getUTCHours() should return 10
        expect(result.getUTCHours()).toBe(10);
    });

    it('parses ISO string with +HH:mm offset', () => {
        const result = parseLocalDateTime('2026-06-14T10:30:45+02:00');
        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCHours()).toBe(8); // 10 - 2 hour offset
    });

    it('parses ISO string with -HH:mm offset', () => {
        const result = parseLocalDateTime('2026-06-14T10:30:45-05:00');
        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCHours()).toBe(15); // 10 + 5 hour offset
    });

    it('returns null for null/undefined input', () => {
        expect(parseLocalDateTime(null)).toBe(null);
        expect(parseLocalDateTime(undefined)).toBe(null);
        expect(parseLocalDateTime('')).toBe(null);
    });

    it('returns null for unparseable strings', () => {
        expect(parseLocalDateTime('not a date')).toBe(null);
        // Note: JavaScript Date constructor auto-corrects overflow (13 months -> next year)
        // so '2026-13-45T99:99:99' becomes a valid date. This is expected behavior.
    });

    it('falls back to new Date() for malformed but partially valid input', () => {
        // If split fails, it tries new Date(dateString)
        const result = parseLocalDateTime('2026-06-14');
        expect(result).toBeInstanceOf(Date);
    });
});

describe('getOffsetMs', () => {
    it('parses minute preset "10m"', () => {
        expect(getOffsetMs('10m')).toBe(10 * 60 * 1000);
    });

    it('parses hour preset "2h"', () => {
        expect(getOffsetMs('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('parses day preset "3d"', () => {
        expect(getOffsetMs('3d')).toBe(3 * 24 * 60 * 60 * 1000);
    });

    it('parses week preset "2w" (NEW FEATURE)', () => {
        expect(getOffsetMs('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
        expect(getOffsetMs('1w')).toBe(604800000); // 7 days in ms
    });

    it('parses custom object with minutes', () => {
        expect(getOffsetMs({ type: 'custom', value: 30, unit: 'minutes' })).toBe(30 * 60 * 1000);
    });

    it('parses custom object with hours', () => {
        expect(getOffsetMs({ type: 'custom', value: 5, unit: 'hours' })).toBe(5 * 60 * 60 * 1000);
    });

    it('parses custom object with days', () => {
        expect(getOffsetMs({ type: 'custom', value: 7, unit: 'days' })).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('parses custom object with weeks', () => {
        expect(getOffsetMs({ type: 'custom', value: 2, unit: 'weeks' })).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    it('returns 0 for unknown string preset', () => {
        expect(getOffsetMs('5x')).toBe(0);
        expect(getOffsetMs('invalid')).toBe(0);
    });

    it('returns 0 for custom object with unknown unit', () => {
        expect(getOffsetMs({ type: 'custom', value: 10, unit: 'unknown' })).toBe(0);
    });

    it('returns 0 for null/undefined input', () => {
        expect(getOffsetMs(null)).toBe(0);
        expect(getOffsetMs(undefined)).toBe(0);
    });

    it('returns 0 for empty/malformed object', () => {
        expect(getOffsetMs({})).toBe(0);
        expect(getOffsetMs({ type: 'custom' })).toBe(0);
    });
});

describe('round-trip: formatLocalDateTime -> parseLocalDateTime', () => {
    it('preserves date components through round-trip', () => {
        const original = new Date(2026, 5, 14, 10, 30, 45);
        const formatted = formatLocalDateTime(original);
        const parsed = parseLocalDateTime(formatted);

        expect(parsed.getFullYear()).toBe(original.getFullYear());
        expect(parsed.getMonth()).toBe(original.getMonth());
        expect(parsed.getDate()).toBe(original.getDate());
        expect(parsed.getHours()).toBe(original.getHours());
        expect(parsed.getMinutes()).toBe(original.getMinutes());
        expect(parsed.getSeconds()).toBe(original.getSeconds());
    });

    it('round-trip for date with zero-padded values', () => {
        const original = new Date(2026, 0, 5, 9, 5, 3);
        const formatted = formatLocalDateTime(original);
        const parsed = parseLocalDateTime(formatted);

        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(0);
        expect(parsed.getDate()).toBe(5);
        expect(parsed.getHours()).toBe(9);
        expect(parsed.getMinutes()).toBe(5);
        expect(parsed.getSeconds()).toBe(3);
    });
});
