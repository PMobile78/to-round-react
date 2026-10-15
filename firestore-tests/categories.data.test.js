/**
 * The web data layer for categories (src/services/data/categories.js) against the emulator
 * with the real firestore.rules.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { OWNER, PAST, seed, setupRulesEnv } from './helpers';
import {
    createCategory, deleteCategory, newCategoryId, reorderCategories, subscribeCategories, updateCategory,
} from '../src/services/data/categories';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const categoryDoc = (name, color, order) => ({ schemaVersion: 2, name, color, order, createdAt: PAST, updatedAt: PAST });
const orders = async () => {
    const snap = await getDocs(collection(device(), `users/${OWNER}/categories`));
    return Object.fromEntries(snap.docs.map((d) => [d.id, d.data().order]));
};
const seedThree = async (order = { a: 1, b: 2, c: 3 }) => {
    await seed(env, `users/${OWNER}/categories/a`, categoryDoc('A', '#da3833', order.a));
    await seed(env, `users/${OWNER}/categories/b`, categoryDoc('B', '#ee603c', order.b));
    await seed(env, `users/${OWNER}/categories/c`, categoryDoc('C', '#fd8b2b', order.c));
};
const cat = (id, order) => ({ id, name: id.toUpperCase(), color: '#da3833', order });

describe('categories data layer', () => {
    it('creates a category with server times', async () => {
        const db = device();
        const id = newCategoryId(db, OWNER);
        await createCategory(db, OWNER, id, { name: 'Home', color: '#da3833', order: 1 });
        const data = (await getDoc(doc(device(), `users/${OWNER}/categories/${id}`))).data();
        expect(data).toMatchObject({ schemaVersion: 2, name: 'Home', color: '#da3833', order: 1 });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
    });

    it('renames a category and deletes it', async () => {
        await seedThree();
        const db = device();
        await updateCategory(db, OWNER, 'a', { name: 'Work', color: '#7db44e' });
        expect((await getDoc(doc(device(), `users/${OWNER}/categories/a`))).data())
            .toMatchObject({ name: 'Work', color: '#7db44e', order: 1 });
        await deleteCategory(db, OWNER, 'a');
        expect(Object.keys(await orders()).sort()).toEqual(['b', 'c']);
    });

    it('reorders with one write: only the moved category gets a new order', async () => {
        await seedThree();
        await reorderCategories(device(), OWNER, [cat('a', 1), cat('c', 3), cat('b', 2)]);
        expect(await orders()).toEqual({ a: 1, b: 2, c: 1.5 });
    });

    it('renumbers all categories in one batch when two share an order', async () => {
        await seedThree({ a: 1, b: 1, c: 2 });
        await reorderCategories(device(), OWNER, [cat('c', 2), cat('a', 1), cat('b', 1)]);
        expect(await orders()).toEqual({ c: 1, a: 2, b: 3 });
    });

    it('lists categories sorted by order, live', async () => {
        await seedThree({ a: 3, b: 1, c: 2 });
        const lists = [];
        const unsubscribe = subscribeCategories(device(), OWNER, (list) => lists.push(list.map((c) => c.id)));
        await vi.waitFor(() => expect(lists.at(-1)).toEqual(['b', 'c', 'a']));
        await updateCategory(device(), OWNER, 'a', { order: 0 });
        await vi.waitFor(() => expect(lists.at(-1)).toEqual(['a', 'b', 'c']));
        unsubscribe();
    });
});
