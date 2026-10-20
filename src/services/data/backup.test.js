import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { MAX_BATCH_WRITES, importCounts, inBatches, planReplace } from './backup';
import {
    categoryUpdateData, newCategoryData, restoredTaskData, settingsUpdateData, taskUpdateData,
} from './convert';
import { createDefaultSettings } from '../../contract/schema';

const SETTINGS = { ...createDefaultSettings('uk'), themeMode: 'dark' };
const category = (id, name, order) => ({ id, name, color: '#da3833', order });
const task = (id, overrides = {}) => ({
    id,
    title: `Task ${id}`,
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-03T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

describe('planReplace: the writes of an import (spec 10)', () => {
    const current = { categoryIds: new Set(['c1', 'c2']), taskIds: new Set(['t1', 't2']) };
    const t1 = task('t1', { status: 'deleted', deletedAt: '2026-01-04T08:00:00.000Z' });
    const t3 = task('t3');
    const backup = { version: 2, settings: SETTINGS, categories: [category('c1', 'Home', 1), category('c3', 'Work', 2)], tasks: [t1, t3] };

    it('updates the records the user has, creates the others with their times and deletes the rest', () => {
        expect(planReplace(current, backup)).toEqual([
            { type: 'update', path: ['categories', 'c1'], data: categoryUpdateData({ name: 'Home', color: '#da3833', order: 1 }) },
            { type: 'set', path: ['categories', 'c3'], data: newCategoryData({ name: 'Work', color: '#da3833', order: 2 }) },
            {
                type: 'update',
                path: ['tasks', 't1'],
                data: taskUpdateData({
                    title: 'Task t1', description: '', categoryId: null, status: 'deleted', due: null, reminders: [],
                    repeat: null, radius: 45, pulseMuted: false, deletedAt: Timestamp.fromMillis(Date.parse('2026-01-04T08:00:00.000Z')),
                }),
            },
            { type: 'set', path: ['tasks', 't3'], data: restoredTaskData(t3) },
            { type: 'delete', path: ['tasks', 't2'] },
            { type: 'delete', path: ['categories', 'c2'] },
            { type: 'update', path: [], data: settingsUpdateData(SETTINGS) },
        ]);
    });

    it('leaves the settings alone when the backup has none (a v1 file)', () => {
        const writes = planReplace(current, { ...backup, version: 1, settings: null });
        expect(writes.filter((w) => w.path.length === 0)).toEqual([]);
    });

    it('counts what the import writes, for the confirmation', () => {
        expect(importCounts(backup, planReplace(current, backup))).toEqual({
            tasks: 2, categories: 2, settings: true, deletedTasks: 1, deletedCategories: 1,
        });
    });
});

describe('inBatches: at most 450 writes in one batch (#92)', () => {
    it.each([[0, []], [1, [1]], [450, [450]], [451, [450, 1]], [901, [450, 450, 1]]])(
        '%i writes -> batches of %j',
        (n, sizes) => {
            const writes = Array.from({ length: n }, (_, i) => ({ type: 'delete', path: ['tasks', `t${i}`] }));
            const batches = inBatches(writes);
            expect(batches.map((b) => b.length)).toEqual(sizes);
            expect(batches.flat()).toEqual(writes);
        },
    );

    it('keeps the limit of the spec', () => {
        expect(MAX_BATCH_WRITES).toBe(450);
    });
});
