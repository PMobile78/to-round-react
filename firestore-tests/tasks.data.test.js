/**
 * The web data layer for tasks (src/services/data/tasks.js) against the emulator with the
 * real firestore.rules: every write the app makes must be one the rules accept.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { OWNER, baseTask, seed, setupRulesEnv } from './helpers';
import {
    completeTask, createTask, deleteTaskForever, finishSeries, muteTaskPulse, newTaskId, restoreTask,
    subscribeTasks, trashTask, updateTask,
} from '../src/services/data/tasks';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

// Each call is a separate client, like a second tab or device of the same user.
const device = () => env.authenticatedContext(OWNER).firestore();
const readTask = async (id) => (await getDoc(doc(device(), `users/${OWNER}/tasks/${id}`))).data();

const FIELDS = {
    title: 'Water plants',
    description: '',
    categoryId: null,
    due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' },
    reminders: [60],
    repeat: null,
    radius: 45,
};

const created = async (fields = FIELDS) => {
    const db = device();
    const id = newTaskId(db, OWNER);
    await createTask(db, OWNER, id, fields);
    return { db, id };
};

describe('tasks data layer: writes the rules accept', () => {
    it('creates a task with server times, overdueAt null and no nextNotifyAt', async () => {
        const { id } = await created();
        const data = await readTask(id);
        expect(data).toMatchObject({ ...FIELDS, schemaVersion: 2, status: 'active', pulseMuted: false, overdueAt: null, deletedAt: null });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
        expect(data).not.toHaveProperty('nextNotifyAt');
    });

    it('updates only the changed fields and keeps the server-owned ones', async () => {
        const db = device();
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({
            due: FIELDS.due, reminders: [60], overdueAt: Timestamp.fromMillis(1000), nextNotifyAt: Timestamp.fromMillis(2000),
        }));
        await updateTask(db, OWNER, 't1', { title: 'Buy bread' });
        expect(await readTask('t1')).toMatchObject({
            title: 'Buy bread', due: FIELDS.due, overdueAt: Timestamp.fromMillis(1000), nextNotifyAt: Timestamp.fromMillis(2000),
        });
    });

    it('moves a task to the trash and restores it', async () => {
        const { db, id } = await created();
        await trashTask(db, OWNER, id);
        const trashed = await readTask(id);
        expect(trashed.status).toBe('deleted');
        expect(trashed.deletedAt).toBeInstanceOf(Timestamp);
        await restoreTask(db, OWNER, id);
        expect(await readTask(id)).toMatchObject({ status: 'active', deletedAt: null });
    });

    it('deletes a task forever', async () => {
        const { db, id } = await created();
        await deleteTaskForever(db, OWNER, id);
        expect(await readTask(id)).toBeUndefined();
    });

    it('finishes a one-off task with "Done" and keeps its due as history', async () => {
        const { db, id } = await created();
        await completeTask(db, OWNER, { id, ...FIELDS, pulseMuted: false }, new Date('2026-10-14T10:00:00.000Z'));
        expect(await readTask(id)).toMatchObject({ status: 'done', due: FIELDS.due, reminders: [60] });
    });

    it('moves a repeating task to its next due with "Done", and "Finish series" ends it', async () => {
        const repeating = { ...FIELDS, repeat: { every: 1, unit: 'days' } };
        const { db, id } = await created(repeating);
        await completeTask(db, OWNER, { id, ...repeating, pulseMuted: false }, new Date('2026-10-14T10:00:00.000Z'));
        expect(await readTask(id)).toMatchObject({ status: 'active', due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        await finishSeries(db, OWNER, id);
        expect(await readTask(id)).toMatchObject({ status: 'done', repeat: { every: 1, unit: 'days' } });
    });

    it('stops the pulse of an overdue task', async () => {
        const { db, id } = await created();
        await muteTaskPulse(db, OWNER, id);
        expect((await readTask(id)).pulseMuted).toBe(true);
    });

    it('fails instead of bringing back a task deleted on another device', async () => {
        const { db, id } = await created();
        await deleteTaskForever(device(), OWNER, id);
        // The rules see no document to update and deny the write, so it never re-creates the task.
        await expect(updateTask(db, OWNER, id, { title: 'Late edit' })).rejects.toMatchObject({ code: 'permission-denied' });
        expect(await readTask(id)).toBeUndefined();
    });
});

describe('tasks data layer: live changes one by one (#94)', () => {
    it('reports added, modified and removed tasks, the first delivery marked initial', async () => {
        await seed(env, `users/${OWNER}/tasks/old`, baseTask({ title: 'Already there' }));
        const deliveries = [];
        const unsubscribe = subscribeTasks(device(), OWNER, (changes, meta) => {
            deliveries.push({ meta, changes: changes.map((c) => `${c.type} ${c.task.id} ${c.task.title}`) });
        });
        await vi.waitFor(() => expect(deliveries).toHaveLength(1));
        expect(deliveries[0]).toEqual({ meta: { initial: true }, changes: ['added old Already there'] });

        const other = device(); // another device of the same user
        const id = newTaskId(other, OWNER);
        await createTask(other, OWNER, id, FIELDS);
        await updateTask(other, OWNER, id, { title: 'Water the cactus' });
        await deleteTaskForever(other, OWNER, 'old');

        const seen = () => deliveries.slice(1).flatMap((d) => d.changes);
        await vi.waitFor(() => expect(seen()).toContain('removed old Already there'));
        expect(seen()).toContain(`modified ${id} Water the cactus`);
        expect(deliveries.slice(1).every((d) => d.meta.initial === false)).toBe(true);
        unsubscribe();
    });

    it('gives a task written on this device estimated times before the server confirms them', async () => {
        const db = device();
        const added = [];
        const unsubscribe = subscribeTasks(db, OWNER, (changes) => {
            changes.filter((c) => c.type === 'added').forEach((c) => added.push(c.task));
        });
        const id = newTaskId(db, OWNER);
        await createTask(db, OWNER, id, FIELDS);
        await vi.waitFor(() => expect(added.map((t) => t.id)).toContain(id));
        const task = added.find((t) => t.id === id);
        expect(Number.isFinite(Date.parse(task.createdAt))).toBe(true);
        expect(task.updatedAt).toBe(task.createdAt);
        unsubscribe();
    });
});
