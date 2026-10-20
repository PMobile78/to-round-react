// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fixtures from '../../../contract/fixtures/migration-v1.json';
import { filtersAfterMigration, migrationNeeded, planMigration } from './migration';
import { createDefaultSettings } from '../../contract/schema';

const ctx = { now: new Date(fixtures.context.now), timeZone: fixtures.context.timeZone, language: fixtures.context.language };
const v1 = { bubbles: fixtures.tasks.map((t) => t.v1), tags: fixtures.categories.v1 };
const titleOf = (id) => fixtures.tasks.find((t) => t.expected && t.expected.id === id).expected.title;

describe('migrationNeeded (spec 9.1)', () => {
    it.each([
        ['no user document yet, v1 tasks', null, { bubbles: [{ id: 'a1' }], tags: [] }, true],
        ['no marker, only v1 categories', { settings: {} }, { bubbles: [], tags: [{ id: 'c1' }] }, true],
        ['the marker is there', { settings: {}, migration: { tasks: 1, categories: 0 } }, { bubbles: [{ id: 'a1' }], tags: [] }, false],
        ['nothing in v1', { settings: {} }, { bubbles: [], tags: [] }, false],
    ])('%s -> %s', (_, userData, data, expected) => {
        expect(migrationNeeded(userData, data)).toBe(expected);
    });
});

describe('planMigration: what the move writes and what the preview shows (spec 9.1, 9.2)', () => {
    const plan = planMigration(v1, ctx);

    it('maps the records by the rules of 9.2', () => {
        expect(plan.categories).toEqual(fixtures.categories.expected);
        expect(plan.tasks).toEqual(fixtures.tasks.filter((t) => t.expected).map((t) => t.expected));
    });

    it('lists what changes and what is skipped', () => {
        expect(plan.preview).toEqual({
            tasks: 8,
            categories: 4,
            rounded: [{ id: 'a1', title: titleOf('a1') }],
            lostFormatting: [{ id: 'a6', title: titleOf('a6') }],
            changed: [{ id: 'a7', title: titleOf('a7') }],
            recolored: [{ id: 'c2', name: 'Work' }, { id: 'c4', name: 'Misc' }],
            skipped: { tasks: 1, categories: 1 },
        });
    });

    it('counts a category beyond the 20 palette colours as skipped', () => {
        const tags = Array.from({ length: 21 }, (_, i) => ({ id: `t${i}`, name: `N${i}`, color: '#000000' }));
        const { preview } = planMigration({ bubbles: [], tags }, ctx);
        expect(preview.categories).toBe(20);
        expect(preview.skipped).toEqual({ tasks: 0, categories: 1 });
    });
});

describe('filtersAfterMigration: "all categories" of v1 becomes null', () => {
    const settings = createDefaultSettings('en');
    const ids = ['c1', 'c2', 'c3'];

    it('writes null for a filter that lists every moved category, in any order', () => {
        expect(filtersAfterMigration({
            ...settings,
            bubbleFilter: { ...settings.bubbleFilter, categoryIds: ['c3', 'c1', 'c2'] },
            listFilter: { ...settings.listFilter, categoryIds: ['c1', 'c2', 'c3'] },
        }, ids)).toEqual({
            bubbleFilter: { ...settings.bubbleFilter, categoryIds: null },
            listFilter: { ...settings.listFilter, categoryIds: null },
        });
    });

    it('keeps a choice of some categories, and a filter that is null already', () => {
        expect(filtersAfterMigration({ ...settings, bubbleFilter: { ...settings.bubbleFilter, categoryIds: ['c1'] } }, ids)).toEqual({});
    });

    it('keeps an empty choice when nothing was moved', () => {
        expect(filtersAfterMigration({ ...settings, listFilter: { ...settings.listFilter, categoryIds: [] } }, [])).toEqual({});
    });
});
