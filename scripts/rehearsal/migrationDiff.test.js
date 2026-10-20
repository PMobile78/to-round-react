// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fixtures from '../../contract/fixtures/migration-v1.json';
import { migrationDiff } from './migrationDiff';

// A v1 export as the old web saved it, and the move of it done right (spec 9.2).
const valid = fixtures.tasks.filter((t) => t.expected);
const FILE = { version: 1, exportedAt: '2026-10-14T11:00:00.000Z', bubbles: valid.map((t) => t.v1), tags: fixtures.categories.v1.filter((tag) => tag.id) };
const MOVED = {
    language: fixtures.context.language,
    migration: { tasks: valid.length, categories: fixtures.categories.expected.length },
    categories: fixtures.categories.expected,
    tasks: valid.map((t) => t.expected),
};

describe('migrationDiff: users/{uid} against the export it was moved from (spec 9.3, rehearsal)', () => {
    it('finds nothing to report when every record moved as 9.2 maps it', () => {
        expect(migrationDiff(FILE, MOVED)).toEqual({
            tasks: { expected: 8, moved: 8 },
            categories: { expected: 4, moved: 4 },
            marker: { tasks: 8, categories: 4 },
            mismatches: [],
        });
    });

    it('reports a field that differs, a record that is missing and one that should not be there', () => {
        const tasks = MOVED.tasks.filter((t) => t.id !== 'a5').map((t) => (t.id === 'a1' ? { ...t, reminders: [60] } : t));
        const categories = [...MOVED.categories, { id: 'zz', name: 'Extra', color: '#4d697e', order: 9 }];
        expect(migrationDiff(FILE, { ...MOVED, tasks, categories }).mismatches).toEqual([
            { kind: 'category', id: 'zz', title: 'Extra', field: 'not in the export' },
            { kind: 'task', id: 'a1', title: fixtures.tasks[0].expected.title, field: 'reminders', expected: fixtures.tasks[0].expected.reminders, moved: [60] },
            { kind: 'task', id: 'a5', title: valid.find((t) => t.v1.id === 'a5').expected.title, field: 'missing' },
        ]);
    });

    it('does not count the time a record got because its own could not be read', () => {
        const fixed = valid.find((t) => t.notes.includes('timestamp-fixed')).expected;
        const tasks = MOVED.tasks.map((t) => (t.id === fixed.id ? { ...t, createdAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-20T09:00:00.000Z' } : t));
        expect(migrationDiff(FILE, { ...MOVED, tasks }).mismatches).toEqual([]);
    });

    it('compares maps whatever the order of their keys', () => {
        const tasks = MOVED.tasks.map((t) => (t.repeat ? { ...t, repeat: Object.fromEntries(Object.entries(t.repeat).reverse()) } : t));
        expect(migrationDiff(FILE, { ...MOVED, tasks }).mismatches).toEqual([]);
    });
});
