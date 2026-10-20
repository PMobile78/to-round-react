// @vitest-environment happy-dom
/**
 * The move from the v1 collections (src/services/data/migration.js) against the emulator with
 * the real firestore.rules (spec 9.1): the writes are ones the rules accept, the v1 collections
 * stay as they are, and a second run skips what the first one wrote.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import fixtures from '../contract/fixtures/migration-v1.json';
import { OWNER, baseTask, seed, setupRulesEnv, userDocWith } from './helpers';
import { checkMigration, planMigration, readV1Data, runMigration } from '../src/services/data/migration';
import { createDefaultSettings } from '../src/contract/schema';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const ctx = { now: new Date(fixtures.context.now), timeZone: fixtures.context.timeZone, language: fixtures.context.language };
const v1Task = (id) => fixtures.tasks.find((t) => t.v1.id === id);
const SETTINGS = createDefaultSettings('uk');

const seedV1 = async () => {
    await seed(env, `user-bubbles/${OWNER}/bubbles/a1`, v1Task('a1').v1);
    await seed(env, `user-bubbles/${OWNER}/bubbles/a5`, v1Task('a5').v1);
    await seed(env, `user-tags/${OWNER}`, { tags: [{ id: 'c1', name: 'Home', color: '#da3833' }, { id: 'c2', name: 'Work', color: '#ee603c' }] });
};

const readAll = async (db, name) => {
    const snapshot = await getDocs(collection(db, `users/${OWNER}/${name}`));
    return Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
};

const migrate = async (db, settings = SETTINGS) => {
    const v1 = await checkMigration(db, OWNER);
    expect(v1).not.toBeNull();
    await runMigration(db, OWNER, planMigration(v1, ctx), settings);
};

describe('migration from v1 (spec 9.1)', () => {
    it('moves the tasks and the categories with their own times and leaves v1 as it is', async () => {
        await seedV1();
        await seed(env, `users/${OWNER}`, userDocWith({
            ...SETTINGS,
            bubbleFilter: { ...SETTINGS.bubbleFilter, categoryIds: ['c2', 'c1'] },
            listFilter: { ...SETTINGS.listFilter, categoryIds: ['c1'] },
        }));
        const db = device();
        await migrate(db);

        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks).sort()).toEqual(['a1', 'a5']);
        const { id, createdAt, updatedAt, ...fields } = v1Task('a1').expected;
        expect(tasks.a1).toMatchObject({
            ...fields,
            schemaVersion: 2,
            overdueAt: null,
            createdAt: Timestamp.fromMillis(Date.parse(createdAt)),
            updatedAt: Timestamp.fromMillis(Date.parse(updatedAt)),
        });
        expect(tasks.a1).not.toHaveProperty('nextNotifyAt');
        const categories = await readAll(db, 'categories');
        expect(categories.c1).toMatchObject({ name: 'Home', color: '#da3833', order: 1 });
        expect(categories.c2).toMatchObject({ name: 'Work', color: '#ee603c', order: 2 });

        const user = (await getDoc(doc(db, `users/${OWNER}`))).data();
        expect(user.migration).toMatchObject({ tasks: 2, categories: 2 });
        expect(user.migration.fromV1At).toBeInstanceOf(Timestamp);
        expect(user.settings.bubbleFilter.categoryIds).toBeNull();
        expect(user.settings.listFilter.categoryIds).toEqual(['c1']);
        expect(await checkMigration(db, OWNER)).toBeNull();

        const v1 = await readV1Data(db, OWNER);
        expect(v1.bubbles.map((b) => b.id).sort()).toEqual(['a1', 'a5']);
        expect(v1.tags).toHaveLength(2);
    });

    it('run again after an interruption, writes only what is missing', async () => {
        await seedV1();
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/tasks/a1`, baseTask({ title: 'Moved by the first run, edited since' }));
        const db = device();
        await migrate(db);

        const tasks = await readAll(db, 'tasks');
        expect(tasks.a1.title).toBe('Moved by the first run, edited since');
        expect(tasks.a5.title).toBe(v1Task('a5').expected.title);
        expect((await getDoc(doc(db, `users/${OWNER}`))).data().migration).toMatchObject({ tasks: 2, categories: 2 });
    });

    it('creates users/{uid} with these settings when the first sign-in could not', async () => {
        await seedV1();
        const db = device();
        await migrate(db, { ...SETTINGS, themeMode: 'dark' });

        const user = (await getDoc(doc(db, `users/${OWNER}`))).data();
        expect(user).toMatchObject({ schemaVersion: 2, settings: { themeMode: 'dark' }, migration: { tasks: 2, categories: 2 } });
        expect(Object.keys(await readAll(db, 'tasks'))).toHaveLength(2);
    });

    it('finds nothing to move for a user without v1 data', async () => {
        expect(await readV1Data(device(), OWNER)).toEqual({ bubbles: [], tags: [] });
        expect(await checkMigration(device(), OWNER)).toBeNull();
    });
});
