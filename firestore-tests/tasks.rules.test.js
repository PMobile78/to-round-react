import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import taskFixtures from '../contract/fixtures/tasks.json';
import { OTHER, OWNER, PAST, baseTask, seed, setupRulesEnv, taskFromFixture } from './helpers';

// Element values of `reminders` are checked by the clients and the server, and the rules have no
// time-zone database: these contract-invalid fixtures pass the rules on purpose.
const NOT_CHECKED_BY_RULES = ['reminder-not-whole-hours', 'reminders-not-ascending', 'due-unknown-zone'];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const taskRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/tasks/${id}`);
const LATER = Timestamp.fromDate(new Date('2026-10-14T12:00:00.000Z'));

describe('users/{uid}/tasks: contract fixtures', () => {
    it.each(taskFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = taskFromFixture(value);
        await assertSucceeds(setDoc(taskRef(id), data));
    });

    it.each(taskFixtures.invalid.filter((f) => !NOT_CHECKED_BY_RULES.includes(f.name)))('rejects $name', async ({ value }) => {
        const [id, data] = taskFromFixture(value);
        await assertFails(setDoc(taskRef(id), data));
    });
});

describe('users/{uid}/tasks: server-owned fields', () => {
    it('rejects overdueAt set by a client on create', async () => {
        await assertFails(setDoc(taskRef('t1'), baseTask({ overdueAt: LATER })));
    });

    it('rejects nextNotifyAt set by a client on create', async () => {
        await assertFails(setDoc(taskRef('t1'), baseTask({ nextNotifyAt: LATER })));
    });

    it('accepts a partial update while the server owns overdueAt and nextNotifyAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ overdueAt: LATER, nextNotifyAt: LATER }));
        await assertSucceeds(updateDoc(taskRef('t1'), { title: 'Buy oat milk', updatedAt: serverTimestamp() }));
    });

    it('rejects a client change of nextNotifyAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ nextNotifyAt: LATER }));
        await assertFails(updateDoc(taskRef('t1'), { nextNotifyAt: PAST, updatedAt: serverTimestamp() }));
    });

    it('rejects a client clearing overdueAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ overdueAt: LATER }));
        await assertFails(updateDoc(taskRef('t1'), { overdueAt: null, updatedAt: serverTimestamp() }));
    });
});

describe('users/{uid}/tasks: times', () => {
    it('rejects an update that does not stamp updatedAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(updateDoc(taskRef('t1'), { title: 'Other' }));
    });

    it('rejects changing createdAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(updateDoc(taskRef('t1'), { createdAt: LATER, updatedAt: serverTimestamp() }));
    });

    it('rejects a createdAt from the future', async () => {
        const future = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
        await assertFails(setDoc(taskRef('t1'), baseTask({ createdAt: future })));
    });

    it('accepts a create stamped with server time', async () => {
        await assertSucceeds(setDoc(taskRef('t1'), baseTask({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
    });
});

describe('users/{uid}/tasks: lifecycle and access', () => {
    it('moves a task to the trash with a server deletedAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertSucceeds(updateDoc(taskRef('t1'), {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }));
    });

    it('lets the owner delete a task permanently', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertSucceeds(deleteDoc(taskRef('t1')));
    });

    it('rejects a task id longer than 128 characters', async () => {
        await assertFails(setDoc(taskRef('x'.repeat(129)), baseTask()));
    });

    it('keeps other users and guests out', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(getDoc(taskRef('t1', OTHER)));
        await assertFails(setDoc(taskRef('t2', OTHER), baseTask()));
        await assertFails(deleteDoc(taskRef('t1', OTHER)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `users/${OWNER}/tasks/t1`)));
    });
});

describe('users/{uid}/tasks: migration re-run and import', () => {
    it('rejects re-writing an existing task with setDoc: a migration re-run skips existing ids', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(setDoc(taskRef('t1'), baseTask()));
    });

    it('replaces an existing task on import with updateDoc of the client fields', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ title: 'Old', overdueAt: LATER, nextNotifyAt: LATER }));
        const fromBackup = { ...baseTask({ title: 'From backup', description: 'restored' }), updatedAt: serverTimestamp() };
        delete fromBackup.createdAt;
        delete fromBackup.overdueAt;
        await assertSucceeds(updateDoc(taskRef('t1'), fromBackup));
    });
});
