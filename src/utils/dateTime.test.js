import { describe, it, expect } from 'vitest';
import {
    formatLocalDateTime,
    getUserTimeZone,
    formatBuildTime
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

describe('formatBuildTime', () => {
    it('shows the build moment in local time as DD.MM.YYYY HH:mm', () => {
        const iso = new Date(2026, 9, 14, 22, 15).toISOString(); // Oct 14, 2026, 22:15 local
        expect(formatBuildTime(iso)).toBe('14.10.2026 22:15');
    });

    it('pads day, month, hours and minutes with zeros', () => {
        const iso = new Date(2026, 0, 5, 7, 3).toISOString(); // Jan 5, 2026, 07:03 local
        expect(formatBuildTime(iso)).toBe('05.01.2026 07:03');
    });

    it('returns "-" when there is no build time (local dev build)', () => {
        expect(formatBuildTime(undefined)).toBe('-');
        expect(formatBuildTime('')).toBe('-');
    });

    it('returns "-" for a value that is not a date', () => {
        expect(formatBuildTime('not-a-date')).toBe('-');
    });
});
