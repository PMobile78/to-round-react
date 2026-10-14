// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/migration-v1.json';
import { mapTaskV1, mapCategoriesV1, settingsFromLocalStorage } from './migrateV1';
import { validateTask, validateCategory, validateSettings } from './validate';

const ctx = {
    now: new Date(fixtures.context.now),
    timeZone: fixtures.context.timeZone,
    language: fixtures.context.language,
    categoryIds: new Set(fixtures.context.categoryIds),
};

describe('mapTaskV1 (contract fixtures)', () => {
    it.each(fixtures.tasks)('$name', ({ v1, expected, notes }) => {
        expect(mapTaskV1(v1, ctx)).toEqual({ task: expected, notes });
        if (expected) expect(validateTask(expected)).toEqual([]);
    });

    it('produces English placeholder titles for English users', () => {
        const { task } = mapTaskV1({ id: 'x', title: '  ' }, { ...ctx, language: 'en' });
        expect(task.title).toBe('Untitled');
    });

    it('keeps timestamps stored as Firestore Timestamp objects', () => {
        const stamp = { toDate: () => new Date('2026-10-01T08:00:00.000Z') };
        const { task, notes } = mapTaskV1({ id: 'x', title: 'T', createdAt: stamp, updatedAt: stamp }, ctx);
        expect(task.createdAt).toBe('2026-10-01T08:00:00.000Z');
        expect(task.updatedAt).toBe('2026-10-01T08:00:00.000Z');
        expect(notes).toEqual([]);
    });
});

describe('mapCategoriesV1 (contract fixtures)', () => {
    it('keeps ids and order and fixes colours', () => {
        const result = mapCategoriesV1(fixtures.categories.v1);
        expect(result).toEqual({ categories: fixtures.categories.expected, notes: fixtures.categories.notes });
        result.categories.forEach((category) => expect(validateCategory(category)).toEqual([]));
    });

    it('returns nothing for a missing array', () => {
        expect(mapCategoriesV1(undefined)).toEqual({ categories: [], notes: [] });
    });

    it('drops categories beyond the 20 palette colours instead of inventing a colour', () => {
        const tags = Array.from({ length: 21 }, (_, i) => ({ id: `t${i}`, name: `N${i}`, color: '#000000' }));
        const { categories, notes } = mapCategoriesV1(tags);
        expect(categories).toHaveLength(20);
        expect(new Set(categories.map((c) => c.color)).size).toBe(20);
        expect(notes).toContainEqual({ id: 't20', code: 'category-dropped' });
    });
});

describe('settingsFromLocalStorage (contract fixtures)', () => {
    it.each(fixtures.settings)('$name', ({ localStorage: stored, deviceLanguage, expected }) => {
        const getItem = (key) => (Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null);
        const result = settingsFromLocalStorage(getItem, deviceLanguage);
        expect(result).toEqual(expected);
        expect(validateSettings(result)).toEqual([]);
    });

    it('falls back to defaults when storage access throws', () => {
        const getItem = () => {
            throw new Error('SecurityError');
        };
        const result = settingsFromLocalStorage(getItem, 'uk');
        expect(result.language).toBe('uk');
        expect(validateSettings(result)).toEqual([]);
    });
});
