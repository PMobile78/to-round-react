import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import categoryFixtures from '../contract/fixtures/categories.json';
import palette from '../contract/palette.json';
import { OTHER, OWNER, categoryFromFixture, seed, setupRulesEnv } from './helpers';

// In Firestore the id is the document path, not a field, so a record "without id" cannot be written.
const NOT_CHECKED_BY_RULES = ['missing-id'];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const categoryRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/categories/${id}`);
const home = () => categoryFromFixture(categoryFixtures.valid[0].value);

describe('users/{uid}/categories: contract fixtures', () => {
    it.each(categoryFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = categoryFromFixture(value);
        await assertSucceeds(setDoc(categoryRef(id), data));
    });

    it.each(categoryFixtures.invalid.filter((f) => !NOT_CHECKED_BY_RULES.includes(f.name)))('rejects $name', async ({ value }) => {
        const [id, data] = categoryFromFixture(value);
        await assertFails(setDoc(categoryRef(id), data));
    });
});

describe('users/{uid}/categories: palette and order', () => {
    it('accepts every colour of contract/palette.json', async () => {
        for (const [i, color] of palette.entries()) {
            const [, data] = categoryFromFixture({ id: `c${i}`, name: `C${i}`, color, order: i + 1 });
            await assertSucceeds(setDoc(categoryRef(`c${i}`), data));
        }
    });

    it('rejects an order that is not a number', async () => {
        const [id, data] = home();
        await assertFails(setDoc(categoryRef(id), { ...data, order: Number.NaN }));
    });

    it('moves a category with a single update', async () => {
        const [id, data] = home();
        await seed(env, `users/${OWNER}/categories/${id}`, data);
        await assertSucceeds(updateDoc(categoryRef(id), { order: 2.5, updatedAt: serverTimestamp() }));
    });
});

describe('users/{uid}/categories: access', () => {
    it('lets the owner delete and keeps others out', async () => {
        const [id, data] = home();
        await seed(env, `users/${OWNER}/categories/${id}`, data);
        await assertFails(getDoc(categoryRef(id, OTHER)));
        await assertFails(deleteDoc(categoryRef(id, OTHER)));
        await assertSucceeds(deleteDoc(categoryRef(id)));
    });
});
