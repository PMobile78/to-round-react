import { describe, it, expect } from 'vitest';
import { sanitizeBubble, sanitizeTag, toIsoOrNull } from './bubbleData';

describe('sanitizeBubble', () => {
    it('returns null for non-object / falsy input', () => {
        expect(sanitizeBubble(null)).toBe(null);
        expect(sanitizeBubble(undefined)).toBe(null);
        expect(sanitizeBubble('x')).toBe(null);
        expect(sanitizeBubble(42)).toBe(null);
    });

    it('returns null when id is missing', () => {
        expect(sanitizeBubble({ title: 'no id' })).toBe(null);
    });

    it('coerces id to string', () => {
        expect(sanitizeBubble({ id: 123 }).id).toBe('123');
    });

    it('applies defaults for a minimal valid bubble', () => {
        const b = sanitizeBubble({ id: 'a' });
        expect(b.title).toBe('');
        expect(b.description).toBe('');
        expect(b.radius).toBe(50);
        expect(b.status).toBe('active');
        expect(b.fillStyle).toBe('transparent');
        expect(b.strokeStyle).toBe('#2f6bdb');
        expect(b.tagId).toBe(null);
        expect(b.dueDate).toBe(null);
        expect(b.notifications).toEqual([]);
        expect(b.recurrence).toBe(null);
        expect(b.overdueSticky).toBe(false);
        expect(b.overduePulseSuppressed).toBe(false);
        expect(b.useRichText).toBe(false);
        expect(typeof b.createdAt).toBe('string');
        expect(typeof b.updatedAt).toBe('string');
        expect(b.deletedAt).toBe(null);
    });

    it('keeps valid values', () => {
        const b = sanitizeBubble({
            id: 'a',
            title: 'T',
            description: 'D',
            radius: 80,
            status: 'done',
            fillStyle: '#fff',
            strokeStyle: '#000',
            tagId: 'tag1',
            dueDate: '2026-01-01T00:00:00',
            notifications: [{ offset: '10m' }],
            recurrence: { every: 1, unit: 'days' },
            overdueSticky: true,
            useRichText: true,
        });
        expect(b.title).toBe('T');
        expect(b.radius).toBe(80);
        expect(b.status).toBe('done');
        expect(b.fillStyle).toBe('#fff');
        expect(b.strokeStyle).toBe('#000');
        expect(b.tagId).toBe('tag1');
        expect(b.dueDate).toBe('2026-01-01T00:00:00');
        expect(b.notifications).toEqual([{ offset: '10m' }]);
        expect(b.recurrence).toEqual({ every: 1, unit: 'days' });
        expect(b.overdueSticky).toBe(true);
        expect(b.useRichText).toBe(true);
    });

    it('falls back invalid status to active and bad radius to 50', () => {
        expect(sanitizeBubble({ id: 'a', status: 'bogus' }).status).toBe('active');
        expect(sanitizeBubble({ id: 'a', radius: -5 }).radius).toBe(50);
        expect(sanitizeBubble({ id: 'a', radius: 'big' }).radius).toBe(50);
    });

    it('drops unknown/dangerous fields', () => {
        const b = sanitizeBubble({ id: 'a', __proto__hack: 1, body: {}, evil: 'x' });
        expect(b.evil).toBeUndefined();
        expect(b.body).toBeUndefined();
    });
});

describe('sanitizeTag', () => {
    it('returns null for invalid input', () => {
        expect(sanitizeTag(null)).toBe(null);
        expect(sanitizeTag(undefined)).toBe(null);
        expect(sanitizeTag('x')).toBe(null);
        expect(sanitizeTag({ name: 'no id' })).toBe(null);
    });

    it('coerces id and applies defaults', () => {
        const tag = sanitizeTag({ id: 7 });
        expect(tag.id).toBe('7');
        expect(tag.name).toBe('');
        expect(tag.color).toBe('#2f6bdb');
    });

    it('keeps valid values and drops extras', () => {
        const tag = sanitizeTag({ id: 'a', name: 'Work', color: '#ff0000', extra: 1 });
        expect(tag).toEqual({ id: 'a', name: 'Work', color: '#ff0000' });
    });
});

describe('toIsoOrNull', () => {
    it('returns null for falsy values', () => {
        expect(toIsoOrNull(null)).toBe(null);
        expect(toIsoOrNull(undefined)).toBe(null);
        expect(toIsoOrNull('')).toBe(null);
        expect(toIsoOrNull(0)).toBe(null);
    });

    it('passes strings through unchanged', () => {
        expect(toIsoOrNull('2026-06-14T10:30:45')).toBe('2026-06-14T10:30:45');
    });

    it('converts a Date to ISO string', () => {
        const d = new Date(Date.UTC(2026, 5, 14, 10, 30, 45));
        expect(toIsoOrNull(d)).toBe('2026-06-14T10:30:45.000Z');
    });

    it('converts a Firestore-like Timestamp via toDate()', () => {
        const ts = { toDate: () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) };
        expect(toIsoOrNull(ts)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('returns null for invalid date input', () => {
        expect(toIsoOrNull(new Date('invalid'))).toBe(null);
        expect(toIsoOrNull('not-a-date')).toBe('not-a-date'); // strings pass through as-is
    });

    it('returns null when toDate yields an invalid date', () => {
        const ts = { toDate: () => new Date('invalid') };
        expect(toIsoOrNull(ts)).toBe(null);
    });
});
