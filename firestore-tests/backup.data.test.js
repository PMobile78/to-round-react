/**
 * Backup export and import (src/services/data/backup.js) against the emulator with the real
 * firestore.rules (spec 10, #92): every write must be one the rules accept, a batch holds at most
 * 450 writes, and an import cut short by a failed batch is finished by importing again.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { OWNER, PAST, baseTask, categoryFromFixture, seed, setupRulesEnv, userDocWith } from './helpers';
import { commitInBatches, exportBackup, planImport } from '../src/services/data/backup';
import { createTask } from '../src/services/data/tasks';
import { createDefaultSettings } from '../src/contract/schema';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const SETTINGS = createDefaultSettings('en');
const ISO_PAST = PAST.toDate().toISOString();

const fileTask = (id, overrides = {}) => ({
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
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-02T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

const readAll = async (db, name) => {
    const snapshot = await getDocs(collection(db, `users/${OWNER}/${name}`));
    return Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
};

describe('backup: export (spec 10)', () => {
    it('writes the settings, the categories by order and the tasks in backup form', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/categories/c2`, categoryFromFixture({ id: 'c2', name: 'Work', color: '#ee603c', order: 2 })[1]);
        await seed(env, `users/${OWNER}/categories/c1`, categoryFromFixture({ id: 'c1', name: 'Home', color: '#da3833', order: 1 })[1]);
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ title: 'Buy milk', overdueAt: Timestamp.fromMillis(1000) }));
        const now = new Date('2026-10-20T12:00:00.000Z');
        expect(await exportBackup(device(), OWNER, now)).toEqual({
            format: 'to-round-backup',
            version: 2,
            exportedAt: '2026-10-20T12:00:00.000Z',
            settings: SETTINGS,
            categories: [
                { id: 'c1', name: 'Home', color: '#da3833', order: 1 },
                { id: 'c2', name: 'Work', color: '#ee603c', order: 2 },
            ],
            tasks: [fileTask('t1', { title: 'Buy milk', createdAt: ISO_PAST, updatedAt: ISO_PAST })],
        });
    });
});

describe('backup: import replaces the data (spec 10)', () => {
    it('updates the shared records, creates the new ones with their own times and deletes the rest', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/categories/c1`, categoryFromFixture({ id: 'c1', name: 'Home', color: '#da3833', order: 1 })[1]);
        await seed(env, `users/${OWNER}/categories/c2`, categoryFromFixture({ id: 'c2', name: 'Old', color: '#ee603c', order: 2 })[1]);
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ title: 'Old title', nextNotifyAt: Timestamp.fromMillis(5000) }));
        await seed(env, `users/${OWNER}/tasks/t2`, baseTask({ title: 'Not in the file' }));
        const db = device();
        const backup = {
            version: 2,
            settings: { ...SETTINGS, language: 'uk' },
            categories: [{ id: 'c1', name: 'Home again', color: '#da3833', order: 1 }, { id: 'c3', name: 'New', color: '#fd8b2b', order: 2 }],
            tasks: [
                fileTask('t1', { title: 'New title', categoryId: 'c3', status: 'deleted', deletedAt: '2026-02-03T08:00:00.000Z' }),
                fileTask('t3', { due: { local: '2026-11-02T09:00', tz: 'Europe/Kyiv' }, reminders: [60] }),
            ],
        };

        const { writes, counts } = await planImport(db, OWNER, backup);
        expect(counts).toEqual({ tasks: 2, categories: 2, settings: true, deletedTasks: 1, deletedCategories: 1 });
        await commitInBatches(db, OWNER, writes);

        const categories = await readAll(db, 'categories');
        expect(Object.keys(categories).sort()).toEqual(['c1', 'c3']);
        expect(categories.c1).toMatchObject({ name: 'Home again', createdAt: PAST });
        expect(categories.c1.updatedAt.toMillis()).toBeGreaterThan(PAST.toMillis());
        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks).sort()).toEqual(['t1', 't3']);
        expect(tasks.t1).toMatchObject({
            title: 'New title', categoryId: 'c3', status: 'deleted', createdAt: PAST,
            deletedAt: Timestamp.fromMillis(Date.parse('2026-02-03T08:00:00.000Z')), nextNotifyAt: Timestamp.fromMillis(5000),
        });
        expect(tasks.t3).toMatchObject({
            schemaVersion: 2, reminders: [60], overdueAt: null,
            createdAt: Timestamp.fromMillis(Date.parse('2026-02-01T08:00:00.000Z')),
            updatedAt: Timestamp.fromMillis(Date.parse('2026-02-02T08:00:00.000Z')),
        });
        expect((await getDoc(doc(db, `users/${OWNER}`))).data().settings.language).toBe('uk');
    });

    it('commits 451 writes in two batches of at most 450', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        const db = device();
        const tasks = Array.from({ length: 451 }, (_, i) => fileTask(`t${i}`));
        const { writes } = await planImport(db, OWNER, { version: 2, settings: null, categories: [], tasks });
        const progress = [];
        await commitInBatches(db, OWNER, writes, (done, total) => progress.push([done, total]));
        expect(progress).toEqual([[450, 451], [451, 451]]);
        expect(Object.keys(await readAll(db, 'tasks'))).toHaveLength(451);
    });

    it('reports the writes committed before a failed batch, and importing again finishes the job', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        const db = device();
        const backup = { version: 2, settings: null, categories: [], tasks: Array.from({ length: 451 }, (_, i) => fileTask(`t${i}`)) };
        const { writes } = await planImport(db, OWNER, backup);
        // Another device creates the last task between the plan and the second batch.
        await createTask(env.authenticatedContext(OWNER).firestore(), OWNER, 't450', {
            title: 'Meanwhile', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45,
        });
        const failure = await commitInBatches(db, OWNER, writes).catch((e) => e);
        expect(failure.code).toBe('permission-denied');
        expect(failure.committed).toBe(450);

        const again = await planImport(db, OWNER, backup);
        await commitInBatches(db, OWNER, again.writes);
        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks)).toHaveLength(451);
        expect(tasks.t450.title).toBe('Task t450');
    });
});
